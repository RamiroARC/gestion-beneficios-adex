using GestionBeneficios.Application.Abstractions;
using GestionBeneficios.Application.Services;
using GestionBeneficios.Domain.Entities;
using GestionBeneficios.Infrastructure.Crm;
using GestionBeneficios.Infrastructure.Persistence;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GestionBeneficios.Infrastructure;

public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        logger.LogInformation("EMAIL stub → {To} | {Subject}", to, subject);
        return Task.CompletedTask;
    }
}

public class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string UserName =>
        accessor.HttpContext?.User?.Identity?.Name
        ?? accessor.HttpContext?.User?.FindFirst("sub")?.Value
        ?? "sistema";

    public IReadOnlyCollection<string> Roles =>
        accessor.HttpContext?.User?
            .FindAll(System.Security.Claims.ClaimTypes.Role)
            .Select(c => c.Value)
            .Concat(accessor.HttpContext.User.FindAll("role").Select(c => c.Value))
            .Distinct()
            .ToArray()
        ?? Array.Empty<string>();
}

public class VencimientoBackgroundService(IServiceProvider sp, ILogger<VencimientoBackgroundService> logger, IConfiguration config) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = sp.CreateScope();
                var puntos = scope.ServiceProvider.GetRequiredService<PuntosAppService>();
                var n = await puntos.ProcesarVencimientosAsync(stoppingToken);
                if (n > 0) logger.LogInformation("Vencimientos procesados: {Count}", n);

                var correos = scope.ServiceProvider.GetRequiredService<ComunicacionAppService>();
                await correos.ProcesarColaAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error en job de vencimientos/correos");
            }

            var minutes = config.GetValue("Jobs:IntervalMinutes", 15);
            await Task.Delay(TimeSpan.FromMinutes(minutes), stoppingToken);
        }
    }
}

public static class InfrastructureDependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var provider = config.GetValue("Database:Provider", "Sqlite");
        var cs = config.GetConnectionString("Beneficios")
                 ?? "Data Source=gestion-beneficios.db";

        services.AddDbContext<BeneficiosDbContext>(opt =>
        {
            if (string.Equals(provider, "SqlServer", StringComparison.OrdinalIgnoreCase))
                opt.UseSqlServer(cs);
            else
                opt.UseSqlite(cs);
        });

        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<IEmpresaDao, EmpresaDao>();
        services.AddScoped<IAlumnoDao, AlumnoDao>();
        services.AddScoped<IContratacionDao, ContratacionDao>();
        services.AddScoped<IPuntosDao, PuntosDao>();
        services.AddScoped<IBeneficioDao, BeneficioDao>();
        services.AddScoped<ICanjeDao, CanjeDao>();
        services.AddScoped<IPlantillaCorreoDao, PlantillaCorreoDao>();
        services.AddScoped<ICorreoDao, CorreoDao>();
        services.AddScoped<ICargaMasivaDao, CargaMasivaDao>();
        services.AddScoped<IAuditoriaDao, AuditoriaDao>();
        services.AddScoped<IConfiguracionDao, ConfiguracionDao>();

        services.Configure<CrmEmpresasOptions>(config.GetSection(CrmEmpresasOptions.SectionName));
        services.Configure<CrmAlumnosOptions>(config.GetSection(CrmAlumnosOptions.SectionName));

        var crmEmpresasOptions = config.GetSection(CrmEmpresasOptions.SectionName).Get<CrmEmpresasOptions>() ?? new CrmEmpresasOptions();
        var crmAlumnosOptions = config.GetSection(CrmAlumnosOptions.SectionName).Get<CrmAlumnosOptions>() ?? new CrmAlumnosOptions();
        var needsCrmAuth = !crmEmpresasOptions.UseMock || !crmAlumnosOptions.UseMock;

        if (needsCrmAuth)
        {
            services.AddSingleton<CrmEmpresasTokenProvider>();
            services.AddHttpClient(CrmEmpresasHttpClient.AuthHttpClientName, (sp, client) =>
            {
                var opts = sp.GetRequiredService<IOptions<CrmEmpresasOptions>>().Value;
                client.BaseAddress = new Uri(opts.BaseUrl.TrimEnd('/') + "/");
                client.Timeout = TimeSpan.FromSeconds(Math.Clamp(opts.RequestTimeoutSeconds, 10, 300));
            });
        }

        if (crmEmpresasOptions.UseMock)
        {
            services.AddSingleton<ICrmEmpresasClient, MockCrmEmpresasClient>();
        }
        else
        {
            services.AddHttpClient<ICrmEmpresasClient, CrmEmpresasHttpClient>((sp, client) =>
            {
                var opts = sp.GetRequiredService<IOptions<CrmEmpresasOptions>>().Value;
                client.BaseAddress = new Uri(opts.BaseUrl.TrimEnd('/') + "/");
                client.Timeout = TimeSpan.FromSeconds(Math.Clamp(opts.RequestTimeoutSeconds, 10, 300));
            });
        }

        if (crmAlumnosOptions.UseMock)
        {
            services.AddSingleton<ICrmAlumnosClient, MockCrmAlumnosClient>();
        }
        else
        {
            services.AddHttpClient<ICrmAlumnosClient, CrmAlumnosHttpClient>((sp, client) =>
            {
                var opts = sp.GetRequiredService<IOptions<CrmAlumnosOptions>>().Value;
                var empresasOpts = sp.GetRequiredService<IOptions<CrmEmpresasOptions>>().Value;
                var baseUrl = string.IsNullOrWhiteSpace(opts.BaseUrl) ? empresasOpts.BaseUrl : opts.BaseUrl;
                client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
                client.Timeout = TimeSpan.FromSeconds(Math.Clamp(opts.RequestTimeoutSeconds, 10, 300));
            });
        }

        services.AddSingleton<IEmailSender, LoggingEmailSender>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();
        services.AddHostedService<VencimientoBackgroundService>();

        return services;
    }

    public static async Task SeedAsync(this IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BeneficiosDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Seed");

        // Estrategia de esquema por proveedor:
        //  - SQL Server (PreProduction): aplica migraciones EF Core versionadas (MigrateAsync).
        //    Las migraciones viven en Migrations/ y están generadas con dialecto SQL Server.
        //  - SQLite (Development): usa EnsureCreatedAsync, que crea el esquema directo del modelo
        //    sin depender de migraciones (que son específicas de SQL Server).
        var isSqlServer = db.Database.IsSqlServer();
        if (isSqlServer)
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }

        // Los schema patchers permanecen como red de seguridad idempotente para bases
        // preexistentes. Sobre una BD recién creada (por migración o EnsureCreated) no tienen
        // efecto, ya que las columnas ya existen.
        await EmpresaSchemaPatcher.ApplyAsync(db, logger);
        await AlumnoSchemaPatcher.ApplyAsync(db, logger);

        if (!await db.PlantillasCorreo.AnyAsync())
        {
            db.PlantillasCorreo.AddRange(
                new PlantillaCorreo
                {
                    Codigo = "PUNTOS_ACUMULADOS",
                    Asunto = "Acumulación de puntos",
                    CuerpoHtml = "<p>Empresa {{Empresa}} acumuló {{Puntos}} puntos. Vencen el {{FechaVencimiento}}. Saldo: {{SaldoDisponible}}</p>",
                    Variables = "Empresa,Puntos,FechaVencimiento,SaldoDisponible",
                    Activo = true
                },
                new PlantillaCorreo
                {
                    Codigo = "CANJE_CONFIRMADO",
                    Asunto = "Confirmación de canje",
                    CuerpoHtml = "<p>{{Empresa}} canjeó {{Beneficio}} por {{Puntos}} puntos. Saldo: {{SaldoDisponible}}</p>",
                    Variables = "Empresa,Beneficio,Puntos,SaldoDisponible",
                    Activo = true
                },
                new PlantillaCorreo
                {
                    Codigo = "PUNTOS_POR_VENCER",
                    Asunto = "Puntos próximos a vencer",
                    CuerpoHtml = "<p>{{Empresa}}: tiene {{Puntos}} puntos que vencen el {{FechaVencimiento}}.</p>",
                    Variables = "Empresa,Puntos,FechaVencimiento",
                    Activo = true
                });
        }

        if (!await db.Beneficios.AnyAsync())
        {
            db.Beneficios.AddRange(
                new Beneficio { Nombre = "Curso Global Learning", Tipo = "Curso", CostoPuntos = 500, Activo = true, Descripcion = "Pendiente catálogo definitivo" },
                new Beneficio { Nombre = "Diplomado Global Learning", Tipo = "Diplomado", CostoPuntos = 2000, Activo = true },
                new Beneficio { Nombre = "Especialización Global Learning", Tipo = "Especializacion", CostoPuntos = 3500, Activo = true });
        }

        if (!await db.Configuraciones.AnyAsync())
        {
            db.Configuraciones.AddRange(
                new ConfiguracionSistema { Clave = "RecordatorioDias", Valor = "30,15,7", Descripcion = "Días antes del vencimiento" },
                new ConfiguracionSistema { Clave = "EmailRemitente", Valor = "noreply@adex.example", Descripcion = "Remitente provisional" });
        }

        await db.SaveChangesAsync();

        var empresas = scope.ServiceProvider.GetRequiredService<EmpresaAppService>();
        await empresas.SyncCatalogAsync();
    }
}
