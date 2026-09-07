using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GestionBeneficios.Application.DTOs;
using GestionBeneficios.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace GestionBeneficios.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class EmpresasController(EmpresaAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<EmpresaDto>> Search([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => service.SearchAsync(q, page, pageSize, ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmpresaDetalleDto>> Get(int id, CancellationToken ct)
    {
        var item = await service.GetDetalleAsync(id, ct);
        return item is null ? NotFound() : item;
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<EmpresaDto> Update(int id, [FromBody] UpdateEmpresaRequest req, CancellationToken ct) =>
        service.UpdateAsync(id, req, ct);

    [HttpGet("sync/estado")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<EmpresaSyncEstadoDto> SyncEstado(CancellationToken ct) => service.GetSyncEstadoAsync(ct);

    [HttpPost("sync/preview")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<EmpresaSyncPreviewDto> SyncPreview([FromBody] EmpresaSyncPeriodRequest req, CancellationToken ct)
        => service.PreviewSyncAsync(req, ct);

    [HttpPost("sync/procesar")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<EmpresaSyncResultDto> SyncProcesar([FromBody] EmpresaSyncPeriodRequest req, CancellationToken ct)
        => service.ProcesarSyncAsync(req, ct);

    [HttpPost("sync/{ruc}")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<EmpresaDto> Sync(string ruc, CancellationToken ct) => service.SyncFromCrmByRucAsync(ruc, ct);

    [HttpPost("sync")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<EmpresaSyncResultDto> SyncAll(CancellationToken ct) => service.SyncCatalogAsync(ct);
}

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class AlumnosController(AlumnoAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<AlumnoDto>> Search([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => service.SearchAsync(q, page, pageSize, ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AlumnoDto>> Get(int id, CancellationToken ct)
    {
        var item = await service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : item;
    }

    [HttpPost]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<AlumnoDto> Create([FromBody] CreateAlumnoRequest req, CancellationToken ct) => service.CreateAsync(req, ct);

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<AlumnoDto> Update(int id, [FromBody] UpdateAlumnoRequest req, CancellationToken ct) => service.UpdateAsync(id, req, ct);

    [HttpGet("sync/estado")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<AlumnoSyncEstadoDto> SyncEstado(CancellationToken ct) => service.GetSyncEstadoAsync(ct);

    [HttpPost("sync/preview")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<AlumnoSyncPreviewDto> SyncPreview([FromBody] EmpresaSyncPeriodRequest req, CancellationToken ct)
        => service.PreviewSyncAsync(req, ct);

    [HttpPost("sync/procesar")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<AlumnoSyncResultDto> SyncProcesar([FromBody] EmpresaSyncPeriodRequest req, CancellationToken ct)
        => service.ProcesarSyncAsync(req, ct);

    [HttpPost("sync/{criterio}")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<AlumnoDto> Sync(string criterio, CancellationToken ct) => service.SyncFromCrmByCriterioAsync(criterio, ct);

    [HttpPost("sync")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<AlumnoSyncResultDto> SyncAll(CancellationToken ct) => service.SyncCatalogAsync(ct);
}

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ContratacionesController(ContratacionAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<ContratacionDto>> Search([FromQuery] int? empresaId, [FromQuery] int? alumnoId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => service.SearchAsync(empresaId, alumnoId, page, pageSize, ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ContratacionDto>> Get(int id, CancellationToken ct)
    {
        var item = await service.GetAsync(id, ct);
        return item is null ? NotFound() : item;
    }

    [HttpPost]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<ContratacionDto> Create([FromBody] CreateContratacionRequest req, CancellationToken ct) => service.CreateAsync(req, ct);

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<ContratacionDto> Update(int id, [FromBody] UpdateContratacionRequest req, CancellationToken ct) => service.UpdateAsync(id, req, ct);
}

[ApiController]
[Route("api/v1/puntos")]
[Authorize]
public class PuntosController(PuntosAppService service) : ControllerBase
{
    [HttpGet("resumen/{empresaId:int}")]
    public Task<PuntosResumenDto> Resumen(int empresaId, [FromQuery] int diasProximos = 30, CancellationToken ct = default)
        => service.ResumenAsync(empresaId, diasProximos, ct);

    [HttpGet("movimientos")]
    public Task<PagedResult<PuntoMovimientoDto>> Movimientos([FromQuery] int? empresaId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => service.MovimientosAsync(empresaId, page, pageSize, ct);

    [HttpPost("procesar-vencimientos")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ProcesarVencimientos(CancellationToken ct)
        => Ok(new { procesados = await service.ProcesarVencimientosAsync(ct) });
}

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class BeneficiosController(BeneficioAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<BeneficioDto>> List([FromQuery] bool? soloActivos, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => service.ListAsync(soloActivos, page, pageSize, ct);

    [HttpPost]
    [Authorize(Roles = "Administrador,GestionBeneficios")]
    public Task<BeneficioDto> Create([FromBody] UpsertBeneficioRequest req, CancellationToken ct) => service.CreateAsync(req, ct);

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador,GestionBeneficios")]
    public Task<BeneficioDto> Update(int id, [FromBody] UpsertBeneficioRequest req, CancellationToken ct) => service.UpdateAsync(id, req, ct);
}

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class CanjesController(CanjeAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<CanjeDto>> List([FromQuery] int? empresaId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => service.ListAsync(empresaId, page, pageSize, ct);

    [HttpPost]
    [Authorize(Roles = "Administrador,Operador")]
    public Task<CanjeDto> Create([FromBody] CreateCanjeRequest req, CancellationToken ct) => service.CrearAsync(req, ct);
}

[ApiController]
[Route("api/v1/cargas-masivas")]
[Authorize(Roles = "Administrador,Operador")]
public class CargasMasivasController(CargaMasivaAppService service) : ControllerBase
{
    [HttpGet("plantilla")]
    public IActionResult Plantilla()
    {
        var bytes = CargaMasivaAppService.GenerarPlantilla();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "plantilla-carga-masiva.xlsx");
    }

    [HttpPost]
    [RequestSizeLimit(20_000_000)]
    public async Task<CargaMasivaDto> Upload(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await service.ValidarExcelAsync(stream, file.FileName, ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CargaMasivaDto>> Get(int id, CancellationToken ct)
    {
        var item = await service.GetAsync(id, ct);
        return item is null ? NotFound() : item;
    }

    [HttpGet("{id:int}/detalles")]
    public Task<IReadOnlyList<CargaDetalleDto>> Detalles(int id, CancellationToken ct) => service.GetDetallesAsync(id, ct);

    [HttpPost("{id:int}/confirmar")]
    public Task<CargaMasivaDto> Confirmar(int id, CancellationToken ct) => service.ConfirmarAsync(id, ct);

    [HttpGet("{id:int}/errores")]
    public async Task<IActionResult> Errores(int id, CancellationToken ct)
    {
        var bytes = await service.ExportarErroresAsync(id, ct);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"errores-carga-{id}.xlsx");
    }
}

[ApiController]
[Route("api/v1/plantillas-correo")]
[Authorize(Roles = "Administrador")]
public class PlantillasController(ComunicacionAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<PlantillaCorreoDto>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => service.ListPlantillasAsync(page, pageSize, ct);

    [HttpPost]
    public Task<PlantillaCorreoDto> Create([FromBody] UpsertPlantillaRequest req, CancellationToken ct) => service.UpsertPlantillaAsync(null, req, ct);

    [HttpPut("{id:int}")]
    public Task<PlantillaCorreoDto> Update(int id, [FromBody] UpsertPlantillaRequest req, CancellationToken ct) => service.UpsertPlantillaAsync(id, req, ct);
}

[ApiController]
[Route("api/v1/correos-enviados")]
[Authorize(Roles = "Administrador")]
public class CorreosController(ComunicacionAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<CorreoEnviadoDto>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => service.ListCorreosAsync(page, pageSize, ct);
}

[ApiController]
[Route("api/v1/auditoria")]
[Authorize(Roles = "Administrador")]
public class AuditoriaController(AuditoriaAppService service) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<AuditoriaDto>> Search([FromQuery] string? entidad, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => service.SearchAsync(entidad, page, pageSize, ct);
}

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController(DashboardAppService service) : ControllerBase
{
    [HttpGet("kpis")]
    public Task<DashboardKpisDto> Kpis(CancellationToken ct) => service.GetAsync(ct);

    [HttpGet("overview")]
    public Task<DashboardOverviewDto> Overview(CancellationToken ct) => service.GetOverviewAsync(ct);
}

[ApiController]
[Route("api/v1/auth")]
public class AuthDevController(IConfiguration config) : ControllerBase
{
    /// <summary>Emite JWT de desarrollo. Reemplazar por Login Centros Académico.</summary>
    [HttpPost("dev-token")]
    [AllowAnonymous]
    public IActionResult DevToken([FromBody] DevLoginRequest req)
    {
        var key = config["Authentication:DevJwt:Key"] ?? "DEV_ONLY_CHANGE_ME_GestionBeneficios_ADEX_2026!";
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var role = string.IsNullOrWhiteSpace(req.Role) ? "Administrador" : req.Role;
        var token = new JwtSecurityToken(
            issuer: config["Authentication:DevJwt:Issuer"] ?? "gestion-beneficios-dev",
            audience: config["Authentication:DevJwt:Audience"] ?? "gestion-beneficios-spa",
            claims:
            [
                new Claim(ClaimTypes.Name, req.UserName),
                new Claim("sub", req.UserName),
                new Claim(ClaimTypes.Role, role),
                new Claim("role", role)
            ],
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds);
        return Ok(new { access_token = new JwtSecurityTokenHandler().WriteToken(token), token_type = "Bearer", role });
    }
}

public record DevLoginRequest(string UserName, string? Role);

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public IActionResult Get() => Ok(new { status = "ok", service = "gestion-beneficios", utc = DateTime.UtcNow });
}
