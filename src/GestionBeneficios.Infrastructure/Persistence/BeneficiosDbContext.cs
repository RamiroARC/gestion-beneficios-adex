using GestionBeneficios.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GestionBeneficios.Infrastructure.Persistence;

public class BeneficiosDbContext(DbContextOptions<BeneficiosDbContext> options) : DbContext(options)
{
    public DbSet<EmpresaAsociada> Empresas => Set<EmpresaAsociada>();
    public DbSet<Alumno> Alumnos => Set<Alumno>();
    public DbSet<Sectorista> Sectoristas => Set<Sectorista>();
    public DbSet<Contratacion> Contrataciones => Set<Contratacion>();
    public DbSet<PuntoLote> PuntoLotes => Set<PuntoLote>();
    public DbSet<PuntoMovimiento> PuntoMovimientos => Set<PuntoMovimiento>();
    public DbSet<Beneficio> Beneficios => Set<Beneficio>();
    public DbSet<Canje> Canjes => Set<Canje>();
    public DbSet<PlantillaCorreo> PlantillasCorreo => Set<PlantillaCorreo>();
    public DbSet<CorreoEnviado> CorreosEnviados => Set<CorreoEnviado>();
    public DbSet<CargaMasiva> CargasMasivas => Set<CargaMasiva>();
    public DbSet<CargaMasivaDetalle> CargasMasivasDetalle => Set<CargaMasivaDetalle>();
    public DbSet<AuditoriaEvento> Auditorias => Set<AuditoriaEvento>();
    public DbSet<ConfiguracionSistema> Configuraciones => Set<ConfiguracionSistema>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EmpresaAsociada>(e =>
        {
            e.ToTable("EmpresaAsociada");
            e.HasKey(x => x.EmpresaId);
            e.HasIndex(x => x.Ruc).IsUnique();
            e.HasIndex(x => x.CrmEmpresaId).IsUnique();
            e.HasIndex(x => x.RazonSocial);
            e.Property(x => x.Ruc).HasMaxLength(20);
            e.Property(x => x.RazonSocial).HasMaxLength(250);
            e.Property(x => x.CrmEmpresaId).HasMaxLength(64);
        });

        modelBuilder.Entity<Alumno>(e =>
        {
            e.ToTable("Alumno");
            e.HasKey(x => x.AlumnoId);
            e.HasIndex(x => x.CodigoAlumno).IsUnique();
            e.Property(x => x.CodigoAlumno).HasMaxLength(50);
            e.Property(x => x.Nombres).HasMaxLength(120);
            e.Property(x => x.Apellidos).HasMaxLength(120);
        });

        modelBuilder.Entity<Sectorista>(e =>
        {
            e.ToTable("Sectorista");
            e.HasKey(x => x.SectoristaId);
        });

        modelBuilder.Entity<Contratacion>(e =>
        {
            e.ToTable("Contratacion");
            e.HasKey(x => x.ContratacionId);
            e.HasIndex(x => new { x.EmpresaId, x.FechaInicio });
            e.HasIndex(x => new { x.AlumnoId, x.FechaInicio });
            e.HasIndex(x => x.Estado);
            e.HasIndex(x => x.FechaFin);
            e.Property(x => x.Sueldo).HasPrecision(18, 2);
            e.Property(x => x.PuntosGenerados).HasPrecision(18, 2);
            e.HasOne(x => x.Empresa).WithMany(x => x.Contrataciones).HasForeignKey(x => x.EmpresaId);
            e.HasOne(x => x.Alumno).WithMany(x => x.Contrataciones).HasForeignKey(x => x.AlumnoId);
            e.HasOne(x => x.Sectorista).WithMany().HasForeignKey(x => x.SectoristaId);
        });

        modelBuilder.Entity<PuntoLote>(e =>
        {
            e.ToTable("PuntoLote");
            e.HasKey(x => x.LoteId);
            e.HasIndex(x => new { x.EmpresaId, x.FechaVencimiento });
            e.Property(x => x.PuntosOriginales).HasPrecision(18, 2);
            e.Property(x => x.PuntosDisponibles).HasPrecision(18, 2);
        });

        modelBuilder.Entity<PuntoMovimiento>(e =>
        {
            e.ToTable("PuntoMovimiento");
            e.HasKey(x => x.MovimientoId);
            e.HasIndex(x => x.IdempotencyKey).IsUnique();
            e.HasIndex(x => new { x.EmpresaId, x.Estado, x.FechaVencimiento });
            e.Property(x => x.Puntos).HasPrecision(18, 2);
            e.Property(x => x.IdempotencyKey).HasMaxLength(120);
        });

        modelBuilder.Entity<Beneficio>(e =>
        {
            e.ToTable("Beneficio");
            e.HasKey(x => x.BeneficioId);
            e.Property(x => x.CostoPuntos).HasPrecision(18, 2);
            e.Property(x => x.Nombre).HasMaxLength(200);
        });

        modelBuilder.Entity<Canje>(e =>
        {
            e.ToTable("Canje");
            e.HasKey(x => x.CanjeId);
            e.HasIndex(x => x.IdempotencyKey).IsUnique();
            e.Property(x => x.PuntosUsados).HasPrecision(18, 2);
            e.Property(x => x.IdempotencyKey).HasMaxLength(120);
            e.HasOne(x => x.Beneficio).WithMany().HasForeignKey(x => x.BeneficioId);
            e.HasOne(x => x.Empresa).WithMany(x => x.Canjes).HasForeignKey(x => x.EmpresaId);
        });

        modelBuilder.Entity<PlantillaCorreo>(e =>
        {
            e.ToTable("PlantillaCorreo");
            e.HasKey(x => x.PlantillaId);
            e.HasIndex(x => x.Codigo).IsUnique();
            e.Property(x => x.Codigo).HasMaxLength(80);
        });

        modelBuilder.Entity<CorreoEnviado>(e =>
        {
            e.ToTable("CorreoEnviado");
            e.HasKey(x => x.CorreoId);
            e.HasIndex(x => x.Estado);
        });

        modelBuilder.Entity<CargaMasiva>(e =>
        {
            e.ToTable("CargaMasiva");
            e.HasKey(x => x.CargaId);
            e.HasMany(x => x.Detalles).WithOne().HasForeignKey(x => x.CargaId);
        });

        modelBuilder.Entity<CargaMasivaDetalle>(e =>
        {
            e.ToTable("CargaMasivaDetalle");
            e.HasKey(x => x.DetalleId);
        });

        modelBuilder.Entity<AuditoriaEvento>(e =>
        {
            e.ToTable("Auditoria");
            e.HasKey(x => x.AuditoriaId);
            e.HasIndex(x => new { x.Entidad, x.FechaUtc });
        });

        modelBuilder.Entity<ConfiguracionSistema>(e =>
        {
            e.ToTable("ConfiguracionSistema");
            e.HasKey(x => x.ConfiguracionId);
            e.HasIndex(x => x.Clave).IsUnique();
        });
    }
}
