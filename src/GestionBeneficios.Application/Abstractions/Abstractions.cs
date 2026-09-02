using GestionBeneficios.Domain.Entities;

namespace GestionBeneficios.Application.Abstractions;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IEmpresaDao
{
    Task<EmpresaAsociada?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<EmpresaAsociada?> GetByRucAsync(string ruc, CancellationToken ct = default);
    Task<EmpresaAsociada?> GetByCrmIdAsync(string crmId, CancellationToken ct = default);
    Task<(IReadOnlyList<EmpresaAsociada> Items, int Total)> SearchAsync(string? q, int page, int pageSize, CancellationToken ct = default);
    Task UpsertAsync(EmpresaAsociada empresa, CancellationToken ct = default);
}

public interface IAlumnoDao
{
    Task<Alumno?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Alumno?> GetByCodigoAsync(string codigo, CancellationToken ct = default);
    Task<(IReadOnlyList<Alumno> Items, int Total)> SearchAsync(string? q, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(Alumno alumno, CancellationToken ct = default);
    Task UpdateAsync(Alumno alumno, CancellationToken ct = default);
}

public interface IContratacionDao
{
    Task<Contratacion?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<(IReadOnlyList<Contratacion> Items, int Total)> SearchAsync(int? empresaId, int? alumnoId, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(Contratacion contratacion, CancellationToken ct = default);
    Task UpdateAsync(Contratacion contratacion, CancellationToken ct = default);
    Task<bool> ExisteSolapeAsync(int alumnoId, DateOnly inicio, DateOnly fin, int? excludeId, CancellationToken ct = default);
}

public interface IPuntosDao
{
    Task AddMovimientoAsync(PuntoMovimiento movimiento, CancellationToken ct = default);
    Task AddLoteAsync(PuntoLote lote, CancellationToken ct = default);
    Task<IReadOnlyList<PuntoLote>> GetLotesDisponiblesAsync(int empresaId, CancellationToken ct = default);
    Task UpdateLoteAsync(PuntoLote lote, CancellationToken ct = default);
    Task<(IReadOnlyList<PuntoMovimiento> Items, int Total)> GetMovimientosAsync(int? empresaId, int page, int pageSize, CancellationToken ct = default);
    Task<decimal> GetSaldoDisponibleAsync(int empresaId, CancellationToken ct = default);
    Task<PuntosResumenData> GetResumenAsync(int empresaId, DateOnly proximosAntesDe, CancellationToken ct = default);
    Task<IReadOnlyList<PuntoLote>> GetLotesVencidosAsync(DateOnly hasta, CancellationToken ct = default);
}

public record PuntosResumenData(decimal Generados, decimal Canjeados, decimal Disponibles, decimal ProximosAVencer, decimal Vencidos);

public interface IBeneficioDao
{
    Task<Beneficio?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<(IReadOnlyList<Beneficio> Items, int Total)> ListAsync(bool? soloActivos, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(Beneficio beneficio, CancellationToken ct = default);
    Task UpdateAsync(Beneficio beneficio, CancellationToken ct = default);
}

public interface ICanjeDao
{
    Task<Canje?> GetByIdempotencyAsync(string key, CancellationToken ct = default);
    Task AddAsync(Canje canje, CancellationToken ct = default);
    Task<(IReadOnlyList<Canje> Items, int Total)> ListAsync(int? empresaId, int page, int pageSize, CancellationToken ct = default);
}

public interface IPlantillaCorreoDao
{
    Task<PlantillaCorreo?> GetByCodigoAsync(string codigo, CancellationToken ct = default);
    Task<(IReadOnlyList<PlantillaCorreo> Items, int Total)> ListAsync(int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(PlantillaCorreo plantilla, CancellationToken ct = default);
    Task UpdateAsync(PlantillaCorreo plantilla, CancellationToken ct = default);
}

public interface ICorreoDao
{
    Task EnqueueAsync(CorreoEnviado correo, CancellationToken ct = default);
    Task<(IReadOnlyList<CorreoEnviado> Items, int Total)> ListAsync(int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<CorreoEnviado>> GetPendientesAsync(int take, CancellationToken ct = default);
    Task UpdateAsync(CorreoEnviado correo, CancellationToken ct = default);
}

public interface ICargaMasivaDao
{
    Task AddAsync(CargaMasiva carga, CancellationToken ct = default);
    Task UpdateAsync(CargaMasiva carga, CancellationToken ct = default);
    Task<CargaMasiva?> GetByIdAsync(int id, bool includeDetalles = false, CancellationToken ct = default);
}

public interface IAuditoriaDao
{
    Task AddAsync(AuditoriaEvento evento, CancellationToken ct = default);
    Task<(IReadOnlyList<AuditoriaEvento> Items, int Total)> SearchAsync(string? entidad, int page, int pageSize, CancellationToken ct = default);
}

public interface IConfiguracionDao
{
    Task<string?> GetValorAsync(string clave, CancellationToken ct = default);
    Task SetValorAsync(string clave, string valor, CancellationToken ct = default);
}

public interface ICrmEmpresasClient
{
    Task<IReadOnlyList<CrmEmpresaDto>> SearchAsync(string? query, CancellationToken ct = default);
    Task<IReadOnlyList<CrmEmpresaDto>> SearchByPeriodAsync(DateTime inicioUtc, DateTime finUtc, CancellationToken ct = default);
    Task<CrmEmpresaDto?> GetByRucAsync(string ruc, CancellationToken ct = default);
}

public record CrmEmpresaDto(
    string CrmEmpresaId,
    string Ruc,
    string RazonSocial,
    string? Categoria,
    bool Activo,
    DateTime CrmCreatedOn,
    string? EstadoCrm = null,
    string? Telefono = null,
    string? Correo = null,
    string? PaginaWeb = null,
    string? EjecutivoComercial = null,
    string? Promotor = null,
    string? Gerencia = null,
    string? Comite = null,
    string? FechaAltaCrm = null)
{
    public DateTime ActualizadoUtc => CrmCreatedOn;
}

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}

public interface ICurrentUser
{
    string UserName { get; }
    IReadOnlyCollection<string> Roles { get; }
}
