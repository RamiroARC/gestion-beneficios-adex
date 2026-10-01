using System.Text;
using GestionBeneficios.Application.Services;
using GestionBeneficios.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var jwtKey = builder.Configuration["Authentication:DevJwt:Key"];
// Fuera de desarrollo la clave JWT es obligatoria: no se permite arrancar con la
// clave de respaldo conocida (defensa en profundidad si falta el secreto del ambiente).
if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "Falta la clave JWT. Definir 'Authentication__DevJwt__Key' por variable de entorno en el servidor.");
    }
    jwtKey = "DEV_ONLY_CHANGE_ME_GestionBeneficios_ADEX_2026!";
}
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Authentication:DevJwt:Issuer"] ?? "gestion-beneficios-dev",
            ValidAudience = builder.Configuration["Authentication:DevJwt:Audience"] ?? "gestion-beneficios-spa",
            IssuerSigningKey = signingKey,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddPolicy("spa", p =>
    p.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"])
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

await app.Services.SeedAsync();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<GestionBeneficios.Api.ExceptionMiddleware>();

// Servir el SPA de Angular (wwwroot) desde la propia app: index.html por defecto y
// archivos estáticos. Evita depender del módulo URL Rewrite de IIS para el fallback.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("spa");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Fallback del router de Angular: cualquier ruta no manejada por un controlador ni por
// un archivo estático devuelve index.html (deep-links / refresh del SPA). Se excluye
// '/api/...' para que las rutas de API inexistentes sigan devolviendo 404 y no el HTML.
app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    var indexPath = System.IO.Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html");
    if (!System.IO.File.Exists(indexPath))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(indexPath);
});

app.Run();

public partial class Program;
