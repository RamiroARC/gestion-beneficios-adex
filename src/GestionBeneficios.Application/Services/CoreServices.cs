using System.Text.Json;
using GestionBeneficios.Application.Abstractions;
using GestionBeneficios.Application.DTOs;
using GestionBeneficios.Domain.Entities;
using GestionBeneficios.Domain.Enums;
using GestionBeneficios.Domain.Services;

namespace GestionBeneficios.Application.Services;

public class EmpresaAppService(
    IEmpresaDao empresas,
    IPuntosDao puntos,
    ICrmGremiosClient crm,
    IUnitOfWork uow,
    IAuditoriaDao auditoria,
    IConfiguracionDao configuracion,
    ICurrentUser user)
{
    private const string SyncInicioKey = "EmpresaSync.UltimoInicio";
    private const string SyncFinKey = "EmpresaSync.UltimoFin";
    private const int SyncOffsetMinutos = 10;

    public async Task<PagedResult<EmpresaDto>> SearchAsync(string? q, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await empresas.SearchAsync(q, page, pageSize, ct);
        return new(items.Select(Map).ToList(), page, pageSize, total);
    }

    public async Task<EmpresaDetalleDto?> GetDetalleAsync(int id, CancellationToken ct = default)
    {
        var e = await empresas.GetByIdAsync(id, ct);
        if (e is null) return null;
        var resumen = await puntos.GetResumenAsync(id, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)), ct);
        return new(Map(e), new PuntosResumenDto(resumen.Generados, resumen.Canjeados, resumen.Disponibles, resumen.ProximosAVencer, resumen.Vencidos));
    }

    public async Task<EmpresaSyncEstadoDto> GetSyncEstadoAsync(CancellationToken ct = default)
    {
        var inicio = await ReadDateAsync(SyncInicioKey, ct);
        var fin = await ReadDateAsync(SyncFinKey, ct);
        DateTime? sugerido = fin?.AddMinutes(-SyncOffsetMinutos);
        return new(inicio, fin, sugerido, SyncOffsetMinutos);
    }

    public async Task<EmpresaSyncPreviewDto> PreviewSyncAsync(EmpresaSyncPeriodRequest req, CancellationToken ct = default)
    {
        var (inicio, fin) = NormalizePeriod(req.Inicio, req.Fin);
        var crmItems = await crm.SearchByPeriodAsync(inicio, fin, ct);
        var preview = new List<EmpresaSyncPreviewItemDto>();
        foreach (var item in crmItems)
        {
            var exists = await empresas.GetByCrmIdAsync(item.CrmEmpresaId, ct) is not null
                         || await empresas.GetByRucAsync(item.Ruc, ct) is not null;
            preview.Add(new EmpresaSyncPreviewItemDto(
                item.CrmEmpresaId, item.Ruc, item.RazonSocial, item.Categoria, item.Activo, item.ActualizadoUtc, exists));
        }
        return new(preview, preview.Count, inicio, fin);
    }

    public async Task<EmpresaSyncResultDto> ProcesarSyncAsync(EmpresaSyncPeriodRequest req, CancellationToken ct = default)
    {
        var (inicio, fin) = NormalizePeriod(req.Inicio, req.Fin);
        var crmItems = await crm.SearchByPeriodAsync(inicio, fin, ct);
        var nuevas = 0;
        var actualizadas = 0;

        foreach (var item in crmItems)
        {
            var existing = await empresas.GetByCrmIdAsync(item.CrmEmpresaId, ct)
                ?? await empresas.GetByRucAsync(item.Ruc, ct);
            var isNew = existing is null || existing.EmpresaId == 0;
            existing ??= new EmpresaAsociada();

            existing.CrmEmpresaId = item.CrmEmpresaId;
            existing.Ruc = item.Ruc;
            existing.RazonSocial = item.RazonSocial;
            existing.Categoria = item.Categoria;
            existing.Activo = item.Activo;
            existing.UltimaSyncUtc = DateTime.UtcNow;
            await empresas.UpsertAsync(existing, ct);

            if (isNew) nuevas++;
            else actualizadas++;
        }

        await configuracion.SetValorAsync(SyncInicioKey, inicio.ToString("O"), ct);
        await configuracion.SetValorAsync(SyncFinKey, fin.ToString("O"), ct);

        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "SYNC_CRM_PERIODO",
            Entidad = nameof(EmpresaAsociada),
            ValorNuevo = JsonSerializer.Serialize(new { inicio, fin, procesadas = crmItems.Count, nuevas, actualizadas })
        }, ct);
        await uow.SaveChangesAsync(ct);

        return new(crmItems.Count, nuevas, actualizadas, inicio, fin);
    }

    public async Task<EmpresaDto> SyncFromCrmByRucAsync(string ruc, CancellationToken ct = default)
    {
        var crmEmpresa = await crm.GetByRucAsync(ruc, ct)
            ?? throw new InvalidOperationException("Empresa inexistente en el CRM de Gremios.");

        var existing = await empresas.GetByCrmIdAsync(crmEmpresa.CrmEmpresaId, ct)
            ?? await empresas.GetByRucAsync(crmEmpresa.Ruc, ct)
            ?? new EmpresaAsociada();

        existing.CrmEmpresaId = crmEmpresa.CrmEmpresaId;
        existing.Ruc = crmEmpresa.Ruc;
        existing.RazonSocial = crmEmpresa.RazonSocial;
        existing.Categoria = crmEmpresa.Categoria;
        existing.Activo = crmEmpresa.Activo;
        existing.UltimaSyncUtc = DateTime.UtcNow;

        await empresas.UpsertAsync(existing, ct);
        await uow.SaveChangesAsync(ct);
        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "SYNC_CRM",
            Entidad = nameof(EmpresaAsociada),
            EntidadId = existing.EmpresaId.ToString(),
            ValorNuevo = JsonSerializer.Serialize(crmEmpresa)
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Map(existing);
    }

    public async Task SyncCatalogAsync(CancellationToken ct = default)
    {
        var list = await crm.SearchAsync(null, ct);
        foreach (var item in list)
        {
            var existing = await empresas.GetByCrmIdAsync(item.CrmEmpresaId, ct)
                ?? await empresas.GetByRucAsync(item.Ruc, ct)
                ?? new EmpresaAsociada();
            existing.CrmEmpresaId = item.CrmEmpresaId;
            existing.Ruc = item.Ruc;
            existing.RazonSocial = item.RazonSocial;
            existing.Categoria = item.Categoria;
            existing.Activo = item.Activo;
            existing.UltimaSyncUtc = DateTime.UtcNow;
            await empresas.UpsertAsync(existing, ct);
        }
        await uow.SaveChangesAsync(ct);
    }

    private async Task<DateTime?> ReadDateAsync(string key, CancellationToken ct)
    {
        var raw = await configuracion.GetValorAsync(key, ct);
        return DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt)
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : null;
    }

    private static (DateTime Inicio, DateTime Fin) NormalizePeriod(DateTime inicio, DateTime fin)
    {
        var i = DateTime.SpecifyKind(inicio.ToUniversalTime(), DateTimeKind.Utc);
        var f = DateTime.SpecifyKind(fin.ToUniversalTime(), DateTimeKind.Utc);
        if (f < i)
            throw new InvalidOperationException("La fecha fin no puede ser anterior a la fecha inicio.");
        return (i, f);
    }

    private static EmpresaDto Map(EmpresaAsociada e) =>
        new(e.EmpresaId, e.CrmEmpresaId, e.Ruc, e.RazonSocial, e.Categoria, e.Activo, e.UltimaSyncUtc);
}

public class AlumnoAppService(IAlumnoDao alumnos, IUnitOfWork uow, IAuditoriaDao auditoria, ICurrentUser user)
{
    public async Task<PagedResult<AlumnoDto>> SearchAsync(string? q, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await alumnos.SearchAsync(q, page, pageSize, ct);
        return new(items.Select(Map).ToList(), page, pageSize, total);
    }

    public async Task<AlumnoDto> CreateAsync(CreateAlumnoRequest req, CancellationToken ct = default)
    {
        var codigo = req.CodigoAlumno?.Trim() ?? "";
        var nombres = req.Nombres?.Trim() ?? "";
        var apellidos = req.Apellidos?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(codigo) || string.IsNullOrWhiteSpace(nombres) || string.IsNullOrWhiteSpace(apellidos))
            throw new InvalidOperationException("Código, nombres y apellidos son obligatorios.");

        if (await alumnos.GetByCodigoAsync(codigo, ct) is not null)
            throw new InvalidOperationException("Ya existe un alumno con ese código.");

        var a = new Alumno
        {
            CodigoAlumno = codigo,
            Nombres = nombres,
            Apellidos = apellidos,
            Carrera = string.IsNullOrWhiteSpace(req.Carrera) ? null : req.Carrera.Trim(),
            Ciclo = string.IsNullOrWhiteSpace(req.Ciclo) ? null : req.Ciclo.Trim(),
            Telefono = string.IsNullOrWhiteSpace(req.Telefono) ? null : req.Telefono.Trim(),
            Correo = string.IsNullOrWhiteSpace(req.Correo) ? null : req.Correo.Trim()
        };
        await alumnos.AddAsync(a, ct);
        await uow.SaveChangesAsync(ct);
        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "CREATE",
            Entidad = nameof(Alumno),
            EntidadId = a.AlumnoId.ToString(),
            ValorNuevo = JsonSerializer.Serialize(req)
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Map(a);
    }

    public async Task<AlumnoDto> UpdateAsync(int id, UpdateAlumnoRequest req, CancellationToken ct = default)
    {
        var a = await alumnos.GetByIdAsync(id, ct) ?? throw new KeyNotFoundException("Alumno no encontrado.");
        var before = JsonSerializer.Serialize(Map(a));
        a.Nombres = req.Nombres.Trim();
        a.Apellidos = req.Apellidos.Trim();
        a.Carrera = req.Carrera;
        a.Ciclo = req.Ciclo;
        a.Telefono = req.Telefono;
        a.Correo = req.Correo;
        await alumnos.UpdateAsync(a, ct);
        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "UPDATE",
            Entidad = nameof(Alumno),
            EntidadId = id.ToString(),
            ValorAnterior = before,
            ValorNuevo = JsonSerializer.Serialize(req)
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Map(a);
    }

    private static AlumnoDto Map(Alumno a) =>
        new(a.AlumnoId, a.CodigoAlumno, a.Nombres, a.Apellidos, a.Carrera, a.Ciclo, a.Telefono, a.Correo);
}

public class ContratacionAppService(
    IContratacionDao contrataciones,
    IEmpresaDao empresas,
    IAlumnoDao alumnos,
    IPuntosDao puntos,
    IUnitOfWork uow,
    IAuditoriaDao auditoria,
    ICorreoDao correos,
    IPlantillaCorreoDao plantillas,
    ICurrentUser user)
{
    public async Task<PagedResult<ContratacionDto>> SearchAsync(int? empresaId, int? alumnoId, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await contrataciones.SearchAsync(empresaId, alumnoId, page, pageSize, ct);
        return new(items.Select(Map).ToList(), page, pageSize, total);
    }

    public async Task<ContratacionDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var c = await contrataciones.GetByIdAsync(id, ct);
        return c is null ? null : Map(c);
    }

    public async Task<ContratacionDto> CreateAsync(CreateContratacionRequest req, CancellationToken ct = default)
    {
        ValidateFechas(req.FechaInicio, req.FechaFin);
        _ = await empresas.GetByIdAsync(req.EmpresaId, ct) ?? throw new InvalidOperationException("Empresa no encontrada. Sincronice desde CRM.");
        _ = await alumnos.GetByIdAsync(req.AlumnoId, ct) ?? throw new InvalidOperationException("Alumno no encontrado.");

        if (await contrataciones.ExisteSolapeAsync(req.AlumnoId, req.FechaInicio, req.FechaFin, null, ct))
            throw new InvalidOperationException("Existe una contratación solapada para el alumno.");

        var mesContratacion = PuntosCalculator.CalcularMesesPreliminar(req.FechaInicio, req.FechaFin);
        var puntosGenerados = PuntosCalculator.CalcularPuntos(req.Sueldo, req.FechaInicio, req.FechaFin);

        var c = new Contratacion
        {
            EmpresaId = req.EmpresaId,
            AlumnoId = req.AlumnoId,
            SectoristaId = req.SectoristaId,
            Anio = req.Anio,
            Categoria = req.Categoria,
            PerfilSolicitado = req.PerfilSolicitado,
            MesContratacion = mesContratacion,
            FechaInicio = req.FechaInicio,
            FechaFin = req.FechaFin,
            Sueldo = req.Sueldo,
            Estado = EstadoContratacion.Vigente,
            PuntosGenerados = puntosGenerados
        };

        await contrataciones.AddAsync(c, ct);
        await uow.SaveChangesAsync(ct);

        var lote = new PuntoLote
        {
            EmpresaId = c.EmpresaId,
            ContratacionId = c.ContratacionId,
            PuntosOriginales = puntosGenerados,
            PuntosDisponibles = puntosGenerados,
            FechaVencimiento = c.FechaFin
        };
        await puntos.AddLoteAsync(lote, ct);
        await uow.SaveChangesAsync(ct);

        await puntos.AddMovimientoAsync(new PuntoMovimiento
        {
            EmpresaId = c.EmpresaId,
            ContratacionId = c.ContratacionId,
            LoteId = lote.LoteId,
            Tipo = TipoPuntoMovimiento.Acumulacion,
            Puntos = puntosGenerados,
            FechaVencimiento = c.FechaFin,
            Estado = EstadoPuntoMovimiento.Disponible,
            IdempotencyKey = $"ACUM-{c.ContratacionId}",
            Observacion = $"Acumulación por contratación {c.ContratacionId}"
        }, ct);

        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "CREATE",
            Entidad = nameof(Contratacion),
            EntidadId = c.ContratacionId.ToString(),
            ValorNuevo = JsonSerializer.Serialize(req)
        }, ct);

        await EncolarPlantillaAsync("PUNTOS_ACUMULADOS", c.EmpresaId, puntosGenerados, c.FechaFin, ct);
        await uow.SaveChangesAsync(ct);

        var loaded = await contrataciones.GetByIdAsync(c.ContratacionId, ct) ?? c;
        return Map(loaded);
    }

    public async Task<ContratacionDto> UpdateAsync(int id, UpdateContratacionRequest req, CancellationToken ct = default)
    {
        ValidateFechas(req.FechaInicio, req.FechaFin);
        var c = await contrataciones.GetByIdAsync(id, ct) ?? throw new KeyNotFoundException("Contratación no encontrada.");
        var before = JsonSerializer.Serialize(Map(c));

        if (await contrataciones.ExisteSolapeAsync(c.AlumnoId, req.FechaInicio, req.FechaFin, id, ct))
            throw new InvalidOperationException("Existe una contratación solapada para el alumno.");

        // Recálculo ante cambio de sueldo/fechas: PENDIENTE reglas de prórroga — se recalcula solo si no hubo canjes sobre el lote (simplificado: no auto-ajusta canjes).
        c.SectoristaId = req.SectoristaId;
        c.Categoria = req.Categoria;
        c.PerfilSolicitado = req.PerfilSolicitado;
        c.FechaInicio = req.FechaInicio;
        c.FechaFin = req.FechaFin;
        c.Sueldo = req.Sueldo;
        c.Estado = Enum.Parse<EstadoContratacion>(req.Estado, true);
        c.ActualizadoUtc = DateTime.UtcNow;
        c.PuntosGenerados = PuntosCalculator.CalcularPuntos(c.Sueldo, c.FechaInicio, c.FechaFin);

        await contrataciones.UpdateAsync(c, ct);
        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "UPDATE",
            Entidad = nameof(Contratacion),
            EntidadId = id.ToString(),
            ValorAnterior = before,
            ValorNuevo = JsonSerializer.Serialize(req)
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Map(c);
    }

    private async Task EncolarPlantillaAsync(string codigo, int empresaId, decimal puntosValor, DateOnly vencimiento, CancellationToken ct)
    {
        var plantilla = await plantillas.GetByCodigoAsync(codigo, ct);
        if (plantilla is null || !plantilla.Activo) return;
        var empresa = await empresas.GetByIdAsync(empresaId, ct);
        var body = plantilla.CuerpoHtml
            .Replace("{{Empresa}}", empresa?.RazonSocial ?? "")
            .Replace("{{Puntos}}", puntosValor.ToString("0.00"))
            .Replace("{{FechaVencimiento}}", vencimiento.ToString("yyyy-MM-dd"))
            .Replace("{{SaldoDisponible}}", (await puntos.GetSaldoDisponibleAsync(empresaId, ct)).ToString("0.00"));
        await correos.EnqueueAsync(new CorreoEnviado
        {
            PlantillaId = plantilla.PlantillaId,
            Destinatario = empresa?.RazonSocial + "@example.invalid",
            Asunto = plantilla.Asunto,
            CuerpoHtml = body,
            Estado = EstadoCorreo.Pendiente
        }, ct);
    }

    private static void ValidateFechas(DateOnly inicio, DateOnly fin)
    {
        if (fin < inicio)
            throw new InvalidOperationException("La fecha fin no puede ser anterior a la fecha inicio.");
    }

    private static ContratacionDto Map(Contratacion c) =>
        new(c.ContratacionId, c.EmpresaId, c.Empresa?.RazonSocial ?? "", c.AlumnoId,
            c.Alumno is null ? "" : $"{c.Alumno.Nombres} {c.Alumno.Apellidos}",
            c.SectoristaId, c.Anio, c.Categoria, c.PerfilSolicitado, c.MesContratacion,
            c.FechaInicio, c.FechaFin, c.Sueldo, c.Estado.ToString(), c.PuntosGenerados);
}
