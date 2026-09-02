using System.Text.Json;
using GestionBeneficios.Application.Abstractions;
using GestionBeneficios.Application.DTOs;
using GestionBeneficios.Domain.Entities;
using GestionBeneficios.Domain.Enums;

namespace GestionBeneficios.Application.Services;

public class BeneficioAppService(IBeneficioDao beneficios, IUnitOfWork uow, IAuditoriaDao auditoria, ICurrentUser user)
{
    public async Task<PagedResult<BeneficioDto>> ListAsync(bool? soloActivos, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await beneficios.ListAsync(soloActivos, page, pageSize, ct);
        return new(items.Select(Map).ToList(), page, pageSize, total);
    }

    public async Task<BeneficioDto> CreateAsync(UpsertBeneficioRequest req, CancellationToken ct = default)
    {
        if (req.CostoPuntos <= 0) throw new InvalidOperationException("El costo en puntos debe ser mayor a cero.");
        var b = new Beneficio
        {
            Nombre = req.Nombre.Trim(),
            Descripcion = req.Descripcion,
            Tipo = req.Tipo,
            CostoPuntos = req.CostoPuntos,
            Activo = req.Activo
        };
        await beneficios.AddAsync(b, ct);
        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "CREATE",
            Entidad = nameof(Beneficio),
            ValorNuevo = JsonSerializer.Serialize(req)
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Map(b);
    }

    public async Task<BeneficioDto> UpdateAsync(int id, UpsertBeneficioRequest req, CancellationToken ct = default)
    {
        var b = await beneficios.GetByIdAsync(id, ct) ?? throw new KeyNotFoundException("Beneficio no encontrado.");
        b.Nombre = req.Nombre.Trim();
        b.Descripcion = req.Descripcion;
        b.Tipo = req.Tipo;
        b.CostoPuntos = req.CostoPuntos;
        b.Activo = req.Activo;
        await beneficios.UpdateAsync(b, ct);
        await uow.SaveChangesAsync(ct);
        return Map(b);
    }

    private static BeneficioDto Map(Beneficio b) =>
        new(b.BeneficioId, b.Nombre, b.Descripcion, b.Tipo, b.CostoPuntos, b.Activo);
}

public class CanjeAppService(
    ICanjeDao canjes,
    IBeneficioDao beneficios,
    IPuntosDao puntos,
    IEmpresaDao empresas,
    IUnitOfWork uow,
    IAuditoriaDao auditoria,
    ICorreoDao correos,
    IPlantillaCorreoDao plantillas,
    ICurrentUser user)
{
    public async Task<PagedResult<CanjeDto>> ListAsync(int? empresaId, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await canjes.ListAsync(empresaId, page, pageSize, ct);
        return new(items.Select(Map).ToList(), page, pageSize, total);
    }

    /// <summary>
    /// Canje atómico con control de concurrencia en la capa de persistencia (transacción).
    /// Flujo de aprobación: no habilitado (descuento inmediato) — decisión provisional Fase 0.
    /// </summary>
    public async Task<CanjeDto> CrearAsync(CreateCanjeRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.IdempotencyKey))
            throw new InvalidOperationException("IdempotencyKey es obligatorio.");

        var existing = await canjes.GetByIdempotencyAsync(req.IdempotencyKey, ct);
        if (existing is not null) return Map(existing);

        var empresa = await empresas.GetByIdAsync(req.EmpresaId, ct)
            ?? throw new InvalidOperationException("Empresa no encontrada.");
        var beneficio = await beneficios.GetByIdAsync(req.BeneficioId, ct)
            ?? throw new InvalidOperationException("Beneficio no encontrado.");
        if (!beneficio.Activo)
            throw new InvalidOperationException("El beneficio no está activo.");

        var lotes = (await puntos.GetLotesDisponiblesAsync(req.EmpresaId, ct))
            .OrderBy(l => l.FechaVencimiento)
            .ThenBy(l => l.LoteId)
            .ToList();

        var saldo = lotes.Sum(l => l.PuntosDisponibles);
        if (saldo < beneficio.CostoPuntos)
            throw new InvalidOperationException("Saldo insuficiente para realizar el canje.");

        var restante = beneficio.CostoPuntos;
        var canje = new Canje
        {
            EmpresaId = req.EmpresaId,
            BeneficioId = req.BeneficioId,
            PuntosUsados = beneficio.CostoPuntos,
            Estado = EstadoCanje.Procesado,
            FechaProcesoUtc = DateTime.UtcNow,
            IdempotencyKey = req.IdempotencyKey,
            SolicitadoPor = user.UserName,
            Beneficio = beneficio,
            Empresa = empresa
        };
        await canjes.AddAsync(canje, ct);
        await uow.SaveChangesAsync(ct);

        foreach (var lote in lotes)
        {
            if (restante <= 0) break;
            var usar = Math.Min(lote.PuntosDisponibles, restante);
            lote.PuntosDisponibles -= usar;
            await puntos.UpdateLoteAsync(lote, ct);
            await puntos.AddMovimientoAsync(new PuntoMovimiento
            {
                EmpresaId = req.EmpresaId,
                CanjeId = canje.CanjeId,
                LoteId = lote.LoteId,
                Tipo = TipoPuntoMovimiento.Canje,
                Puntos = usar,
                FechaVencimiento = lote.FechaVencimiento,
                Estado = EstadoPuntoMovimiento.Consumido,
                IdempotencyKey = $"CANJE-{canje.CanjeId}-LOTE-{lote.LoteId}",
                Observacion = $"Canje beneficio {beneficio.Nombre}"
            }, ct);
            restante -= usar;
        }

        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "CANJE",
            Entidad = nameof(Canje),
            EntidadId = canje.CanjeId.ToString(),
            ValorNuevo = JsonSerializer.Serialize(req)
        }, ct);

        var plantilla = await plantillas.GetByCodigoAsync("CANJE_CONFIRMADO", ct);
        if (plantilla is { Activo: true })
        {
            var body = plantilla.CuerpoHtml
                .Replace("{{Empresa}}", empresa.RazonSocial)
                .Replace("{{Beneficio}}", beneficio.Nombre)
                .Replace("{{Puntos}}", beneficio.CostoPuntos.ToString("0.00"))
                .Replace("{{SaldoDisponible}}", (await puntos.GetSaldoDisponibleAsync(req.EmpresaId, ct)).ToString("0.00"));
            await correos.EnqueueAsync(new CorreoEnviado
            {
                PlantillaId = plantilla.PlantillaId,
                Destinatario = $"{empresa.Ruc}@example.invalid",
                Asunto = plantilla.Asunto,
                CuerpoHtml = body
            }, ct);
        }

        await uow.SaveChangesAsync(ct);
        return Map(canje);
    }

    private static CanjeDto Map(Canje c) =>
        new(c.CanjeId, c.EmpresaId, c.Empresa?.Ruc ?? "", c.Empresa?.RazonSocial ?? "", c.BeneficioId, c.Beneficio?.Nombre ?? "", c.PuntosUsados, c.Estado.ToString(), c.FechaSolicitudUtc);
}

public class PuntosAppService(IPuntosDao puntos, IUnitOfWork uow, IAuditoriaDao auditoria, ICurrentUser user)
{
    public Task<PuntosResumenDto> ResumenAsync(int empresaId, int diasProximos, CancellationToken ct = default) =>
        puntos.GetResumenAsync(empresaId, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(diasProximos)), ct)
            .ContinueWith(t =>
            {
                var r = t.Result;
                return new PuntosResumenDto(r.Generados, r.Canjeados, r.Disponibles, r.ProximosAVencer, r.Vencidos);
            }, ct);

    public async Task<PagedResult<PuntoMovimientoDto>> MovimientosAsync(int? empresaId, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await puntos.GetMovimientosAsync(empresaId, page, pageSize, ct);
        return new(items.Select(m => new PuntoMovimientoDto(
            m.MovimientoId, m.EmpresaId, m.ContratacionId, m.CanjeId, m.Tipo.ToString(), m.Puntos,
            m.FechaMovimientoUtc, m.FechaVencimiento, m.Estado.ToString(), m.Observacion)).ToList(), page, pageSize, total);
    }

    public async Task<int> ProcesarVencimientosAsync(CancellationToken ct = default)
    {
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var lotes = await puntos.GetLotesVencidosAsync(hoy, ct);
        var count = 0;
        foreach (var lote in lotes.Where(l => l.PuntosDisponibles > 0))
        {
            var pts = lote.PuntosDisponibles;
            lote.PuntosDisponibles = 0;
            await puntos.UpdateLoteAsync(lote, ct);
            await puntos.AddMovimientoAsync(new PuntoMovimiento
            {
                EmpresaId = lote.EmpresaId,
                ContratacionId = lote.ContratacionId,
                LoteId = lote.LoteId,
                Tipo = TipoPuntoMovimiento.Vencimiento,
                Puntos = pts,
                FechaVencimiento = lote.FechaVencimiento,
                Estado = EstadoPuntoMovimiento.Vencido,
                IdempotencyKey = $"VENC-{lote.LoteId}-{hoy:yyyyMMdd}",
                Observacion = "Vencimiento automático de puntos"
            }, ct);
            count++;
        }

        if (count > 0)
        {
            await auditoria.AddAsync(new AuditoriaEvento
            {
                Usuario = user.UserName,
                Accion = "VENCIMIENTO_JOB",
                Entidad = nameof(PuntoLote),
                ValorNuevo = $"lotes={count}"
            }, ct);
            await uow.SaveChangesAsync(ct);
        }

        return count;
    }
}

public class DashboardAppService(
    IEmpresaDao empresas,
    IAlumnoDao alumnos,
    IContratacionDao contrataciones,
    IBeneficioDao beneficios,
    ICanjeDao canjes,
    IPuntosDao puntos)
{
    public async Task<DashboardKpisDto> GetAsync(CancellationToken ct = default)
    {
        var (emps, empTotal) = await empresas.SearchAsync(null, 1, 1, ct);
        var (alums, alumTotal) = await alumnos.SearchAsync(null, 1, 1, ct);
        var (contrs, _) = await contrataciones.SearchAsync(null, null, 1, 5000, ct);
        var vigentes = contrs.Count(c => c.Estado == EstadoContratacion.Vigente);
        var vencidas = contrs.Count(c => c.Estado == EstadoContratacion.Vencida);
        var (bens, benTotal) = await beneficios.ListAsync(true, 1, 1, ct);
        var (canjeList, canjeTotal) = await canjes.ListAsync(null, 1, 1, ct);

        decimal gen = 0, canj = 0, disp = 0, prox = 0, venc = 0;
        var (empsAll, _) = await empresas.SearchAsync(null, 1, 10000, ct);
        foreach (var e in empsAll)
        {
            var r = await puntos.GetResumenAsync(e.EmpresaId, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)), ct);
            gen += r.Generados;
            canj += r.Canjeados;
            disp += r.Disponibles;
            prox += r.ProximosAVencer;
            venc += r.Vencidos;
        }

        return new DashboardKpisDto(
            empTotal, alumTotal, vigentes, vencidas, gen, canj, disp, prox, venc, canjeTotal, benTotal);
    }

    public async Task<DashboardOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var kpis = await GetAsync(ct);
        var (empsAll, _) = await empresas.SearchAsync(null, 1, 10000, ct);
        var (contrs, _) = await contrataciones.SearchAsync(null, null, 1, 50000, ct);
        var (canjeList, _) = await canjes.ListAsync(null, 1, 50000, ct);
        var nuevosDesde = DateTime.UtcNow.AddDays(-90);
        var proximosAntesDe = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));

        var filas = new List<DashboardEmpresaFilaDto>();
        foreach (var e in empsAll)
        {
            var empresaContrs = contrs.Where(c => c.EmpresaId == e.EmpresaId).ToList();
            var alumnosCount = empresaContrs.Select(c => c.AlumnoId).Distinct().Count();
            var nuevos = empresaContrs.Count(c => c.CreadoUtc >= nuevosDesde);
            var vigentesCount = empresaContrs.Count(c => c.Estado == EstadoContratacion.Vigente);
            var vencidasCount = empresaContrs.Count(c => c.Estado == EstadoContratacion.Vencida);
            var canjesCount = canjeList.Count(c => c.EmpresaId == e.EmpresaId);
            var resumen = await puntos.GetResumenAsync(e.EmpresaId, proximosAntesDe, ct);
            var puntosPorCanje = canjesCount > 0 ? Math.Round(resumen.Canjeados / canjesCount, 2) : 0;

            filas.Add(new DashboardEmpresaFilaDto(
                e.EmpresaId,
                e.RazonSocial,
                alumnosCount,
                nuevos,
                empresaContrs.Count,
                resumen.Generados,
                vigentesCount,
                vencidasCount,
                canjesCount,
                resumen.Canjeados,
                resumen.Disponibles,
                puntosPorCanje));
        }

        filas = filas.OrderByDescending(f => f.Contrataciones).ThenByDescending(f => f.Canjes).ToList();

        var totalOps = kpis.ContratacionesVigentes + kpis.CanjesRealizados + kpis.ContratacionesVencidas;
        var distribucion = new DashboardDistribucionDto(
            BuildDistribucionItem("Contrat. vigentes", kpis.ContratacionesVigentes, totalOps, kpis.PuntosGenerados),
            BuildDistribucionItem("Canjes", kpis.CanjesRealizados, totalOps, kpis.PuntosUtilizados),
            BuildDistribucionItem("Contrat. vencidas", kpis.ContratacionesVencidas, totalOps, kpis.PuntosVencidos),
            totalOps);

        var saldoNeto = kpis.PuntosGenerados - kpis.PuntosUtilizados - kpis.PuntosVencidos;
        var calculo = new DashboardCalculoDto(
            kpis.PuntosGenerados,
            kpis.PuntosUtilizados,
            kpis.PuntosVencidos,
            saldoNeto);

        return new DashboardOverviewDto(kpis, filas, distribucion, calculo);
    }

    private static DashboardDistribucionItemDto BuildDistribucionItem(string etiqueta, int cantidad, int total, decimal puntos)
    {
        var pct = total > 0 ? Math.Round((decimal)cantidad / total * 100, 1) : 0;
        var unit = cantidad > 0 ? Math.Round(puntos / cantidad, 2) : 0;
        return new DashboardDistribucionItemDto(etiqueta, cantidad, pct, puntos, unit);
    }
}
