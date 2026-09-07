using System.Globalization;
using System.Text.Json;
using ClosedXML.Excel;
using GestionBeneficios.Application.Abstractions;
using GestionBeneficios.Application.DTOs;
using GestionBeneficios.Domain.Entities;
using GestionBeneficios.Domain.Enums;
using GestionBeneficios.Domain.Services;
using Microsoft.Extensions.DependencyInjection;

namespace GestionBeneficios.Application.Services;

public class CargaMasivaAppService(
    ICargaMasivaDao cargas,
    IEmpresaDao empresas,
    IAlumnoDao alumnos,
    IContratacionDao contrataciones,
    ContratacionAppService contratacionService,
    IUnitOfWork uow,
    IAuditoriaDao auditoria,
    ICurrentUser user)
{
    public async Task<CargaMasivaDto> ValidarExcelAsync(Stream stream, string fileName, CancellationToken ct = default)
    {
        if (!fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Solo se aceptan archivos .xlsx");

        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.FirstOrDefault(w =>
            w.Name.Equals("Carga", StringComparison.OrdinalIgnoreCase)) ?? workbook.Worksheets.First();
        var headers = sheet.Row(1).CellsUsed().Select(c => c.GetString().Trim().ToLowerInvariant()).ToList();
        var required = new[] { "ruc", "codigoalumno", "nombres", "apellidos", "fechainicio", "fechafin", "sueldo", "anio", "mescontratacion" };
        foreach (var col in required)
        {
            if (!headers.Contains(col))
                throw new InvalidOperationException($"Falta la columna obligatoria: {col}");
        }

        var carga = new CargaMasiva
        {
            NombreArchivo = fileName,
            Usuario = user.UserName,
            Estado = EstadoCargaMasiva.Previsualizacion
        };

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var r = 2; r <= lastRow; r++)
        {
            var row = sheet.Row(r);
            if (row.IsEmpty()) continue;

            var payload = new Dictionary<string, string>
            {
                ["ruc"] = Cell(row, headers, "ruc"),
                ["codigoAlumno"] = Cell(row, headers, "codigoalumno"),
                ["nombres"] = Cell(row, headers, "nombres"),
                ["apellidos"] = Cell(row, headers, "apellidos"),
                ["carrera"] = Cell(row, headers, "carrera"),
                ["ciclo"] = Cell(row, headers, "ciclo"),
                ["telefono"] = Cell(row, headers, "telefono"),
                ["correo"] = Cell(row, headers, "correo"),
                ["fechaInicio"] = Cell(row, headers, "fechainicio"),
                ["fechaFin"] = Cell(row, headers, "fechafin"),
                ["sueldo"] = Cell(row, headers, "sueldo"),
                ["anio"] = Cell(row, headers, "anio"),
                ["mesContratacion"] = Cell(row, headers, "mescontratacion"),
                ["categoria"] = Cell(row, headers, "categoria"),
                ["perfilSolicitado"] = Cell(row, headers, "perfilsolicitado")
            };

            var errors = new List<string>();
            if (string.IsNullOrWhiteSpace(payload["ruc"])) errors.Add("RUC obligatorio");
            if (string.IsNullOrWhiteSpace(payload["codigoAlumno"])) errors.Add("CodigoAlumno obligatorio");
            if (string.IsNullOrWhiteSpace(payload["nombres"])) errors.Add("Nombres obligatorio");
            if (string.IsNullOrWhiteSpace(payload["apellidos"])) errors.Add("Apellidos obligatorio");
            if (!DateOnly.TryParse(payload["fechaInicio"], CultureInfo.InvariantCulture, out var fechaInicio)) errors.Add("FechaInicio inválida");
            if (!DateOnly.TryParse(payload["fechaFin"], CultureInfo.InvariantCulture, out var fechaFin)) errors.Add("FechaFin inválida");
            if (!decimal.TryParse(payload["sueldo"], NumberStyles.Number, CultureInfo.InvariantCulture, out _)) errors.Add("Sueldo inválido");
            if (!int.TryParse(payload["anio"], NumberStyles.Integer, CultureInfo.InvariantCulture, out _)) errors.Add("Anio inválido");

            if (errors.Count == 0)
            {
                try
                {
                    _ = PuntosCalculator.CalcularDiasCalendario(fechaInicio, fechaFin);
                }
                catch (Exception ex)
                {
                    errors.Add(ex.Message);
                }
            }

            EmpresaAsociada? empresaLocal = null;
            Alumno? alumnoLocal = null;

            if (!string.IsNullOrWhiteSpace(payload["ruc"]))
            {
                empresaLocal = await empresas.GetByRucAsync(payload["ruc"], ct);
                if (empresaLocal is null) errors.Add("Empresa no registrada (RUC inexistente)");
            }

            if (!string.IsNullOrWhiteSpace(payload["codigoAlumno"]))
                alumnoLocal = await alumnos.GetByCodigoAsync(payload["codigoAlumno"], ct);

            if (errors.Count == 0 && alumnoLocal is not null)
            {
                if (await contrataciones.ExisteSolapeAsync(alumnoLocal.AlumnoId, fechaInicio, fechaFin, null, ct))
                    errors.Add($"El alumno (DNI {payload["codigoAlumno"]}) ya tiene una contratación vigente en ese periodo ({payload["fechaInicio"]} – {payload["fechaFin"]})");
            }

            carga.Detalles.Add(new CargaMasivaDetalle
            {
                NumeroFila = r,
                PayloadJson = JsonSerializer.Serialize(payload),
                EsValido = errors.Count == 0,
                Errores = errors.Count == 0 ? null : string.Join("; ", errors)
            });
        }

        carga.TotalFilas = carga.Detalles.Count;
        carga.FilasValidas = carga.Detalles.Count(d => d.EsValido);
        carga.FilasInvalidas = carga.TotalFilas - carga.FilasValidas;

        await cargas.AddAsync(carga, ct);
        await auditoria.AddAsync(new AuditoriaEvento
        {
            Usuario = user.UserName,
            Accion = "CARGA_VALIDAR",
            Entidad = nameof(CargaMasiva),
            ValorNuevo = fileName
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Map(carga);
    }

    public async Task<CargaMasivaDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var c = await cargas.GetByIdAsync(id, true, ct);
        return c is null ? null : Map(c);
    }

    public async Task<IReadOnlyList<CargaDetalleDto>> GetDetallesAsync(int id, CancellationToken ct = default)
    {
        var c = await cargas.GetByIdAsync(id, true, ct) ?? throw new KeyNotFoundException("Carga no encontrada.");
        return c.Detalles.Select(MapDetalle).ToList();
    }

    public async Task<CargaMasivaDto> ConfirmarAsync(int id, CancellationToken ct = default)
    {
        var carga = await cargas.GetByIdAsync(id, true, ct) ?? throw new KeyNotFoundException("Carga no encontrada.");
        if (carga.Estado is not EstadoCargaMasiva.Previsualizacion)
            throw new InvalidOperationException("La carga no está en estado de previsualización.");

        carga.Estado = EstadoCargaMasiva.Procesando;
        await cargas.UpdateAsync(carga, ct);
        await uow.SaveChangesAsync(ct);

        foreach (var det in carga.Detalles.Where(d => d.EsValido))
        {
            var payload = JsonSerializer.Deserialize<Dictionary<string, string>>(det.PayloadJson)!;
            try
            {
                var empresa = await empresas.GetByRucAsync(payload["ruc"], ct)
                    ?? throw new InvalidOperationException("Empresa no registrada (RUC inexistente)");

                var alumno = await alumnos.GetByCodigoAsync(payload["codigoAlumno"], ct);
                if (alumno is null)
                {
                    alumno = new Alumno
                    {
                        CodigoAlumno = payload["codigoAlumno"],
                        Dni = payload["codigoAlumno"],
                        Nombres = payload["nombres"],
                        Apellidos = payload["apellidos"],
                        Carrera = payload.GetValueOrDefault("carrera"),
                        Ciclo = payload.GetValueOrDefault("ciclo"),
                        Telefono = payload.GetValueOrDefault("telefono"),
                        Correo = payload.GetValueOrDefault("correo")
                    };
                    await alumnos.AddAsync(alumno, ct);
                    await uow.SaveChangesAsync(ct);
                }

                var fechaInicio = DateOnly.Parse(payload["fechaInicio"], CultureInfo.InvariantCulture);
                var fechaFin = DateOnly.Parse(payload["fechaFin"], CultureInfo.InvariantCulture);
                var meses = PuntosCalculator.CalcularMesesPreliminar(fechaInicio, fechaFin);

                await contratacionService.CreateAsync(new CreateContratacionRequest(
                    empresa.EmpresaId,
                    alumno.AlumnoId,
                    null,
                    int.Parse(payload["anio"]),
                    payload.GetValueOrDefault("categoria"),
                    payload.GetValueOrDefault("perfilSolicitado"),
                    meses,
                    fechaInicio,
                    fechaFin,
                    decimal.Parse(payload["sueldo"], CultureInfo.InvariantCulture)
                ), ct);

                det.Procesado = true;
                carga.FilasProcesadas++;
            }
            catch (Exception ex)
            {
                det.EsValido = false;
                det.Errores = (det.Errores is null ? "" : det.Errores + "; ") + ex.Message;
                carga.FilasInvalidas++;
                carga.FilasValidas = Math.Max(0, carga.FilasValidas - 1);
            }
        }

        carga.Estado = carga.FilasInvalidas > 0 ? EstadoCargaMasiva.CompletadaConErrores : EstadoCargaMasiva.Completada;
        carga.CompletadoUtc = DateTime.UtcNow;
        await cargas.UpdateAsync(carga, ct);
        await uow.SaveChangesAsync(ct);
        return Map(carga);
    }

    public async Task<byte[]> ExportarErroresAsync(int id, CancellationToken ct = default)
    {
        var carga = await cargas.GetByIdAsync(id, true, ct) ?? throw new KeyNotFoundException("Carga no encontrada.");
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Errores");
        ws.Cell(1, 1).Value = "Fila";
        ws.Cell(1, 2).Value = "Errores";
        ws.Cell(1, 3).Value = "Payload";
        var i = 2;
        foreach (var d in carga.Detalles.Where(x => !x.EsValido || !string.IsNullOrEmpty(x.Errores)))
        {
            ws.Cell(i, 1).Value = d.NumeroFila;
            ws.Cell(i, 2).Value = d.Errores;
            ws.Cell(i, 3).Value = d.PayloadJson;
            i++;
        }
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public static byte[] GenerarPlantilla()
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Carga");
        var headers = new[]
        {
            "ruc", "codigoalumno", "nombres", "apellidos", "fechainicio", "fechafin",
            "sueldo", "anio", "mescontratacion", "carrera", "ciclo", "telefono", "correo",
            "categoria", "perfilsolicitado"
        };
        for (var i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#003B70");
        }

        ws.Cell(2, 1).Value = "20100070970";
        ws.Cell(2, 2).Value = "12345678";
        ws.Cell(2, 3).Value = "Ana";
        ws.Cell(2, 4).Value = "Perez";
        ws.Cell(2, 5).Value = "2026-03-01";
        ws.Cell(2, 6).Value = "2026-08-31";
        ws.Cell(2, 7).Value = 1500.00;
        ws.Cell(2, 8).Value = 2026;
        ws.Cell(2, 9).Value = 3;
        ws.Cell(2, 10).Value = "Comercio Exterior";
        ws.Cell(2, 11).Value = "6";
        ws.Cell(2, 12).Value = "999888777";
        ws.Cell(2, 13).Value = "ana.perez@correo.com";
        ws.Cell(2, 14).Value = "";
        ws.Cell(2, 15).Value = "Practicante";
        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents();

        var info = wb.AddWorksheet("Instrucciones");
        info.Cell(1, 1).Value = "Campo";
        info.Cell(1, 2).Value = "Obligatorio";
        info.Cell(1, 3).Value = "Formato";
        info.Row(1).Style.Font.Bold = true;
        var rows = new (string Campo, string Obligatorio, string Formato)[]
        {
            ("ruc", "Sí", "11 dígitos. Debe existir en Empresas asociadas."),
            ("codigoalumno", "Sí", "Nro. DNI (8 dígitos). Se crea en Alumnos si no existe."),
            ("nombres", "Sí", "Texto."),
            ("apellidos", "Sí", "Texto."),
            ("fechainicio", "Sí", "Fecha yyyy-MM-dd (ejemplo: 2026-03-01)."),
            ("fechafin", "Sí", "Fecha yyyy-MM-dd (ejemplo: 2026-08-31)."),
            ("sueldo", "Sí", "Número decimal con punto (ejemplo: 1500.00)."),
            ("anio", "Sí", "Año de la contratación (ejemplo: 2026)."),
            ("mescontratacion", "Sí", "Meses completos de 30 días entre fechainicio y fechafin."),
            ("carrera", "No", "Texto. Catálogo de carreras."),
            ("ciclo", "No", "Texto o número."),
            ("telefono", "No", "Texto."),
            ("correo", "No", "Correo electrónico."),
            ("categoria", "No", "Categoría de la empresa, si aplica."),
            ("perfilsolicitado", "No", "Perfil de la contratación (catálogo mantenible).")
        };
        for (var i = 0; i < rows.Length; i++)
        {
            info.Cell(i + 2, 1).Value = rows[i].Campo;
            info.Cell(i + 2, 2).Value = rows[i].Obligatorio;
            info.Cell(i + 2, 3).Value = rows[i].Formato;
        }
        info.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static string Cell(IXLRow row, List<string> headers, string name)
    {
        var idx = headers.IndexOf(name);
        if (idx < 0) return "";
        return row.Cell(idx + 1).GetString().Trim();
    }

    private static CargaDetalleDto MapDetalle(CargaMasivaDetalle d)
    {
        var payload = JsonSerializer.Deserialize<Dictionary<string, string>>(d.PayloadJson) ?? new();
        string Get(string key) => payload.GetValueOrDefault(key) ?? "";
        return new CargaDetalleDto(
            d.DetalleId, d.NumeroFila, d.EsValido, d.Errores, d.Procesado, d.PayloadJson,
            Get("ruc"), Get("codigoAlumno"), Get("nombres"), Get("apellidos"),
            Get("fechaInicio"), Get("fechaFin"), Get("sueldo"), Get("anio"));
    }

    private static CargaMasivaDto Map(CargaMasiva c) =>
        new(c.CargaId, c.NombreArchivo, c.Usuario, c.Estado.ToString(), c.TotalFilas, c.FilasValidas, c.FilasInvalidas, c.FilasProcesadas, c.CreadoUtc);
}

public class ComunicacionAppService(IPlantillaCorreoDao plantillas, ICorreoDao correos, IEmailSender sender, IUnitOfWork uow)
{
    public async Task<PagedResult<PlantillaCorreoDto>> ListPlantillasAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await plantillas.ListAsync(page, pageSize, ct);
        return new(items.Select(p => new PlantillaCorreoDto(p.PlantillaId, p.Codigo, p.Asunto, p.CuerpoHtml, p.Variables, p.Activo)).ToList(), page, pageSize, total);
    }

    public async Task<PlantillaCorreoDto> UpsertPlantillaAsync(int? id, UpsertPlantillaRequest req, CancellationToken ct = default)
    {
        PlantillaCorreo p;
        if (id is null)
        {
            p = new PlantillaCorreo
            {
                Codigo = req.Codigo,
                Asunto = req.Asunto,
                CuerpoHtml = req.CuerpoHtml,
                Variables = req.Variables,
                Activo = req.Activo
            };
            await plantillas.AddAsync(p, ct);
        }
        else
        {
            var list = await plantillas.ListAsync(1, 1000, ct);
            p = list.Items.FirstOrDefault(x => x.PlantillaId == id)
                ?? throw new KeyNotFoundException("Plantilla no encontrada.");
            p.Codigo = req.Codigo;
            p.Asunto = req.Asunto;
            p.CuerpoHtml = req.CuerpoHtml;
            p.Variables = req.Variables;
            p.Activo = req.Activo;
            await plantillas.UpdateAsync(p, ct);
        }
        await uow.SaveChangesAsync(ct);
        return new(p.PlantillaId, p.Codigo, p.Asunto, p.CuerpoHtml, p.Variables, p.Activo);
    }

    public async Task<PagedResult<CorreoEnviadoDto>> ListCorreosAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await correos.ListAsync(page, pageSize, ct);
        return new(items.Select(c => new CorreoEnviadoDto(c.CorreoId, c.Destinatario, c.Asunto, c.Estado.ToString(), c.Intentos, c.CreadoUtc, c.EnviadoUtc, c.Error)).ToList(), page, pageSize, total);
    }

    public async Task<int> ProcesarColaAsync(CancellationToken ct = default)
    {
        var pendientes = await correos.GetPendientesAsync(50, ct);
        var ok = 0;
        foreach (var correo in pendientes)
        {
            try
            {
                await sender.SendAsync(correo.Destinatario, correo.Asunto, correo.CuerpoHtml, ct);
                correo.Estado = EstadoCorreo.Enviado;
                correo.EnviadoUtc = DateTime.UtcNow;
                correo.Intentos++;
                ok++;
            }
            catch (Exception ex)
            {
                correo.Intentos++;
                correo.Error = ex.Message;
                if (correo.Intentos >= 5) correo.Estado = EstadoCorreo.Error;
            }
            await correos.UpdateAsync(correo, ct);
        }
        await uow.SaveChangesAsync(ct);
        return ok;
    }
}

public class AuditoriaAppService(IAuditoriaDao auditoria)
{
    public async Task<PagedResult<AuditoriaDto>> SearchAsync(string? entidad, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await auditoria.SearchAsync(entidad, page, pageSize, ct);
        return new(items.Select(a => new AuditoriaDto(a.AuditoriaId, a.Usuario, a.FechaUtc, a.Accion, a.Entidad, a.EntidadId, a.ValorAnterior, a.ValorNuevo)).ToList(), page, pageSize, total);
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<EmpresaAppService>();
        services.AddScoped<AlumnoAppService>();
        services.AddScoped<ContratacionAppService>();
        services.AddScoped<BeneficioAppService>();
        services.AddScoped<CanjeAppService>();
        services.AddScoped<PuntosAppService>();
        services.AddScoped<DashboardAppService>();
        services.AddScoped<CargaMasivaAppService>();
        services.AddScoped<ComunicacionAppService>();
        services.AddScoped<AuditoriaAppService>();
        return services;
    }
}
