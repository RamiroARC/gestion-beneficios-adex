using GestionBeneficios.Application.Abstractions;
using GestionBeneficios.Domain.Entities;
using GestionBeneficios.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GestionBeneficios.Infrastructure.Persistence;

public class EfUnitOfWork(BeneficiosDbContext db) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

public class EmpresaDao(BeneficiosDbContext db) : IEmpresaDao
{
    public Task<EmpresaAsociada?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Empresas.FirstOrDefaultAsync(x => x.EmpresaId == id, ct);

    public Task<EmpresaAsociada?> GetByRucAsync(string ruc, CancellationToken ct = default) =>
        db.Empresas.FirstOrDefaultAsync(x => x.Ruc == ruc, ct);

    public Task<EmpresaAsociada?> GetByCrmIdAsync(string crmId, CancellationToken ct = default) =>
        db.Empresas.FirstOrDefaultAsync(x => x.CrmEmpresaId == crmId, ct);

    public async Task<(IReadOnlyList<EmpresaAsociada> Items, int Total)> SearchAsync(string? q, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Empresas.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(x => x.Ruc.ToLower().Contains(term) || x.RazonSocial.ToLower().Contains(term));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(x => x.RazonSocial).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task UpsertAsync(EmpresaAsociada empresa, CancellationToken ct = default)
    {
        if (empresa.EmpresaId == 0) await db.Empresas.AddAsync(empresa, ct);
        else db.Empresas.Update(empresa);
    }
}

public class AlumnoDao(BeneficiosDbContext db) : IAlumnoDao
{
    public Task<Alumno?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Alumnos.FirstOrDefaultAsync(x => x.AlumnoId == id, ct);

    public Task<Alumno?> GetByCodigoAsync(string codigo, CancellationToken ct = default) =>
        db.Alumnos.FirstOrDefaultAsync(x => x.CodigoAlumno == codigo, ct);

    public async Task<(IReadOnlyList<Alumno> Items, int Total)> SearchAsync(string? q, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Alumnos.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(x =>
                x.CodigoAlumno.ToLower().Contains(term) ||
                x.Nombres.ToLower().Contains(term) ||
                x.Apellidos.ToLower().Contains(term));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(x => x.Apellidos).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task AddAsync(Alumno alumno, CancellationToken ct = default) => db.Alumnos.AddAsync(alumno, ct).AsTask();
    public Task UpdateAsync(Alumno alumno, CancellationToken ct = default)
    {
        db.Alumnos.Update(alumno);
        return Task.CompletedTask;
    }
}

public class ContratacionDao(BeneficiosDbContext db) : IContratacionDao
{
    public Task<Contratacion?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Contrataciones.Include(x => x.Empresa).Include(x => x.Alumno).FirstOrDefaultAsync(x => x.ContratacionId == id, ct);

    public async Task<(IReadOnlyList<Contratacion> Items, int Total)> SearchAsync(int? empresaId, int? alumnoId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Contrataciones.Include(x => x.Empresa).Include(x => x.Alumno).AsQueryable();
        if (empresaId is not null) query = query.Where(x => x.EmpresaId == empresaId);
        if (alumnoId is not null) query = query.Where(x => x.AlumnoId == alumnoId);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.FechaInicio).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task AddAsync(Contratacion contratacion, CancellationToken ct = default) =>
        db.Contrataciones.AddAsync(contratacion, ct).AsTask();

    public Task UpdateAsync(Contratacion contratacion, CancellationToken ct = default)
    {
        db.Contrataciones.Update(contratacion);
        return Task.CompletedTask;
    }

    public Task<bool> ExisteSolapeAsync(int alumnoId, DateOnly inicio, DateOnly fin, int? excludeId, CancellationToken ct = default) =>
        db.Contrataciones.AnyAsync(x =>
            x.AlumnoId == alumnoId &&
            x.Estado != EstadoContratacion.Anulada &&
            (excludeId == null || x.ContratacionId != excludeId) &&
            x.FechaInicio < fin && inicio < x.FechaFin, ct);
}

public class PuntosDao(BeneficiosDbContext db) : IPuntosDao
{
    public Task AddMovimientoAsync(PuntoMovimiento movimiento, CancellationToken ct = default) =>
        db.PuntoMovimientos.AddAsync(movimiento, ct).AsTask();

    public Task AddLoteAsync(PuntoLote lote, CancellationToken ct = default) =>
        db.PuntoLotes.AddAsync(lote, ct).AsTask();

    public async Task<IReadOnlyList<PuntoLote>> GetLotesDisponiblesAsync(int empresaId, CancellationToken ct = default)
    {
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        return await db.PuntoLotes
            .Where(x => x.EmpresaId == empresaId && x.PuntosDisponibles > 0 && x.FechaVencimiento >= hoy)
            .OrderBy(x => x.FechaVencimiento)
            .ToListAsync(ct);
    }

    public Task UpdateLoteAsync(PuntoLote lote, CancellationToken ct = default)
    {
        db.PuntoLotes.Update(lote);
        return Task.CompletedTask;
    }

    public async Task<(IReadOnlyList<PuntoMovimiento> Items, int Total)> GetMovimientosAsync(int? empresaId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.PuntoMovimientos.AsQueryable();
        if (empresaId is not null) query = query.Where(x => x.EmpresaId == empresaId);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.FechaMovimientoUtc).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task<decimal> GetSaldoDisponibleAsync(int empresaId, CancellationToken ct = default)
    {
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        return await db.PuntoLotes
            .Where(x => x.EmpresaId == empresaId && x.FechaVencimiento >= hoy)
            .SumAsync(x => x.PuntosDisponibles, ct);
    }

    public async Task<PuntosResumenData> GetResumenAsync(int empresaId, DateOnly proximosAntesDe, CancellationToken ct = default)
    {
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var generados = await db.PuntoMovimientos.Where(x => x.EmpresaId == empresaId && x.Tipo == TipoPuntoMovimiento.Acumulacion).SumAsync(x => (decimal?)x.Puntos, ct) ?? 0;
        var canjeados = await db.PuntoMovimientos.Where(x => x.EmpresaId == empresaId && x.Tipo == TipoPuntoMovimiento.Canje).SumAsync(x => (decimal?)x.Puntos, ct) ?? 0;
        var vencidos = await db.PuntoMovimientos.Where(x => x.EmpresaId == empresaId && x.Tipo == TipoPuntoMovimiento.Vencimiento).SumAsync(x => (decimal?)x.Puntos, ct) ?? 0;
        var disponibles = await db.PuntoLotes.Where(x => x.EmpresaId == empresaId && x.FechaVencimiento >= hoy).SumAsync(x => (decimal?)x.PuntosDisponibles, ct) ?? 0;
        var proximos = await db.PuntoLotes.Where(x => x.EmpresaId == empresaId && x.FechaVencimiento >= hoy && x.FechaVencimiento <= proximosAntesDe).SumAsync(x => (decimal?)x.PuntosDisponibles, ct) ?? 0;
        return new PuntosResumenData(generados, canjeados, disponibles, proximos, vencidos);
    }

    public async Task<IReadOnlyList<PuntoLote>> GetLotesVencidosAsync(DateOnly hasta, CancellationToken ct = default) =>
        await db.PuntoLotes.Where(x => x.FechaVencimiento < hasta && x.PuntosDisponibles > 0).ToListAsync(ct);
}

public class BeneficioDao(BeneficiosDbContext db) : IBeneficioDao
{
    public Task<Beneficio?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Beneficios.FirstOrDefaultAsync(x => x.BeneficioId == id, ct);

    public async Task<(IReadOnlyList<Beneficio> Items, int Total)> ListAsync(bool? soloActivos, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Beneficios.AsQueryable();
        if (soloActivos == true) query = query.Where(x => x.Activo);
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(x => x.Nombre).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task AddAsync(Beneficio beneficio, CancellationToken ct = default) => db.Beneficios.AddAsync(beneficio, ct).AsTask();
    public Task UpdateAsync(Beneficio beneficio, CancellationToken ct = default)
    {
        db.Beneficios.Update(beneficio);
        return Task.CompletedTask;
    }
}

public class CanjeDao(BeneficiosDbContext db) : ICanjeDao
{
    public Task<Canje?> GetByIdempotencyAsync(string key, CancellationToken ct = default) =>
        db.Canjes.Include(x => x.Beneficio).FirstOrDefaultAsync(x => x.IdempotencyKey == key, ct);

    public Task AddAsync(Canje canje, CancellationToken ct = default) => db.Canjes.AddAsync(canje, ct).AsTask();

    public async Task<(IReadOnlyList<Canje> Items, int Total)> ListAsync(int? empresaId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Canjes.Include(x => x.Beneficio).AsQueryable();
        if (empresaId is not null) query = query.Where(x => x.EmpresaId == empresaId);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.FechaSolicitudUtc).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }
}

public class PlantillaCorreoDao(BeneficiosDbContext db) : IPlantillaCorreoDao
{
    public Task<PlantillaCorreo?> GetByCodigoAsync(string codigo, CancellationToken ct = default) =>
        db.PlantillasCorreo.FirstOrDefaultAsync(x => x.Codigo == codigo, ct);

    public async Task<(IReadOnlyList<PlantillaCorreo> Items, int Total)> ListAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var total = await db.PlantillasCorreo.CountAsync(ct);
        var items = await db.PlantillasCorreo.OrderBy(x => x.Codigo).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task AddAsync(PlantillaCorreo plantilla, CancellationToken ct = default) => db.PlantillasCorreo.AddAsync(plantilla, ct).AsTask();
    public Task UpdateAsync(PlantillaCorreo plantilla, CancellationToken ct = default)
    {
        db.PlantillasCorreo.Update(plantilla);
        return Task.CompletedTask;
    }
}

public class CorreoDao(BeneficiosDbContext db) : ICorreoDao
{
    public Task EnqueueAsync(CorreoEnviado correo, CancellationToken ct = default) => db.CorreosEnviados.AddAsync(correo, ct).AsTask();

    public async Task<(IReadOnlyList<CorreoEnviado> Items, int Total)> ListAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var total = await db.CorreosEnviados.CountAsync(ct);
        var items = await db.CorreosEnviados.OrderByDescending(x => x.CreadoUtc).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task<IReadOnlyList<CorreoEnviado>> GetPendientesAsync(int take, CancellationToken ct = default) =>
        await db.CorreosEnviados.Where(x => x.Estado == EstadoCorreo.Pendiente).OrderBy(x => x.CreadoUtc).Take(take).ToListAsync(ct);

    public Task UpdateAsync(CorreoEnviado correo, CancellationToken ct = default)
    {
        db.CorreosEnviados.Update(correo);
        return Task.CompletedTask;
    }
}

public class CargaMasivaDao(BeneficiosDbContext db) : ICargaMasivaDao
{
    public Task AddAsync(CargaMasiva carga, CancellationToken ct = default) => db.CargasMasivas.AddAsync(carga, ct).AsTask();
    public Task UpdateAsync(CargaMasiva carga, CancellationToken ct = default)
    {
        db.CargasMasivas.Update(carga);
        return Task.CompletedTask;
    }

    public Task<CargaMasiva?> GetByIdAsync(int id, bool includeDetalles = false, CancellationToken ct = default)
    {
        IQueryable<CargaMasiva> q = db.CargasMasivas;
        if (includeDetalles) q = q.Include(x => x.Detalles);
        return q.FirstOrDefaultAsync(x => x.CargaId == id, ct);
    }
}

public class AuditoriaDao(BeneficiosDbContext db) : IAuditoriaDao
{
    public Task AddAsync(AuditoriaEvento evento, CancellationToken ct = default) => db.Auditorias.AddAsync(evento, ct).AsTask();

    public async Task<(IReadOnlyList<AuditoriaEvento> Items, int Total)> SearchAsync(string? entidad, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Auditorias.AsQueryable();
        if (!string.IsNullOrWhiteSpace(entidad)) query = query.Where(x => x.Entidad == entidad);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.FechaUtc).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }
}

public class ConfiguracionDao(BeneficiosDbContext db) : IConfiguracionDao
{
    public async Task<string?> GetValorAsync(string clave, CancellationToken ct = default) =>
        (await db.Configuraciones.FirstOrDefaultAsync(x => x.Clave == clave, ct))?.Valor;

    public async Task SetValorAsync(string clave, string valor, CancellationToken ct = default)
    {
        var item = await db.Configuraciones.FirstOrDefaultAsync(x => x.Clave == clave, ct);
        if (item is null) await db.Configuraciones.AddAsync(new ConfiguracionSistema { Clave = clave, Valor = valor }, ct);
        else item.Valor = valor;
    }
}
