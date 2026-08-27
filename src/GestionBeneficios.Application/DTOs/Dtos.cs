namespace GestionBeneficios.Application.DTOs;

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public record EmpresaDto(int EmpresaId, string CrmEmpresaId, string Ruc, string RazonSocial, string? Categoria, bool Activo, DateTime UltimaSyncUtc);
public record EmpresaDetalleDto(EmpresaDto Empresa, PuntosResumenDto Puntos);

public record EmpresaSyncPeriodRequest(DateTime Inicio, DateTime Fin);

public record EmpresaSyncEstadoDto(
    DateTime? UltimoInicio,
    DateTime? UltimoFin,
    DateTime? SiguienteInicioSugerido,
    int OffsetMinutos);

public record EmpresaSyncPreviewItemDto(
    string CrmEmpresaId,
    string Ruc,
    string RazonSocial,
    string? Categoria,
    bool Activo,
    DateTime ActualizadoUtc,
    bool YaExisteLocal);

public record EmpresaSyncPreviewDto(
    IReadOnlyList<EmpresaSyncPreviewItemDto> Items,
    int Total,
    DateTime Inicio,
    DateTime Fin);

public record EmpresaSyncResultDto(
    int Procesadas,
    int Nuevas,
    int Actualizadas,
    DateTime Inicio,
    DateTime Fin);

public record AlumnoDto(int AlumnoId, string CodigoAlumno, string Nombres, string Apellidos, string? Carrera, string? Ciclo, string? Telefono, string? Correo);
public record CreateAlumnoRequest(string CodigoAlumno, string Nombres, string Apellidos, string? Carrera, string? Ciclo, string? Telefono, string? Correo);
public record UpdateAlumnoRequest(string Nombres, string Apellidos, string? Carrera, string? Ciclo, string? Telefono, string? Correo);

public record ContratacionDto(
    int ContratacionId, int EmpresaId, string EmpresaRazonSocial, int AlumnoId, string AlumnoNombre,
    int? SectoristaId, int Anio, string? Categoria, string? PerfilSolicitado, int MesContratacion,
    DateOnly FechaInicio, DateOnly FechaFin, decimal Sueldo, string Estado, decimal PuntosGenerados);

public record CreateContratacionRequest(
    int EmpresaId, int AlumnoId, int? SectoristaId, int Anio, string? Categoria, string? PerfilSolicitado,
    int MesContratacion, DateOnly FechaInicio, DateOnly FechaFin, decimal Sueldo);

public record UpdateContratacionRequest(
    int? SectoristaId, string? Categoria, string? PerfilSolicitado, DateOnly FechaInicio, DateOnly FechaFin,
    decimal Sueldo, string Estado);

public record PuntosResumenDto(decimal Generados, decimal Canjeados, decimal Disponibles, decimal ProximosAVencer, decimal Vencidos);
public record PuntoMovimientoDto(long MovimientoId, int EmpresaId, int? ContratacionId, int? CanjeId, string Tipo, decimal Puntos, DateTime FechaMovimientoUtc, DateOnly? FechaVencimiento, string Estado, string? Observacion);

public record BeneficioDto(int BeneficioId, string Nombre, string? Descripcion, string? Tipo, decimal CostoPuntos, bool Activo);
public record UpsertBeneficioRequest(string Nombre, string? Descripcion, string? Tipo, decimal CostoPuntos, bool Activo);

public record CanjeDto(int CanjeId, int EmpresaId, int BeneficioId, string BeneficioNombre, decimal PuntosUsados, string Estado, DateTime FechaSolicitudUtc);
public record CreateCanjeRequest(int EmpresaId, int BeneficioId, string IdempotencyKey);

public record PlantillaCorreoDto(int PlantillaId, string Codigo, string Asunto, string CuerpoHtml, string? Variables, bool Activo);
public record UpsertPlantillaRequest(string Codigo, string Asunto, string CuerpoHtml, string? Variables, bool Activo);

public record CorreoEnviadoDto(long CorreoId, string Destinatario, string Asunto, string Estado, int Intentos, DateTime CreadoUtc, DateTime? EnviadoUtc, string? Error);

public record CargaMasivaDto(int CargaId, string NombreArchivo, string Usuario, string Estado, int TotalFilas, int FilasValidas, int FilasInvalidas, int FilasProcesadas, DateTime CreadoUtc);
public record CargaDetalleDto(long DetalleId, int NumeroFila, bool EsValido, string? Errores, bool Procesado, string PayloadJson);

public record AuditoriaDto(long AuditoriaId, string Usuario, DateTime FechaUtc, string Accion, string Entidad, string? EntidadId, string? ValorAnterior, string? ValorNuevo);

public record DashboardKpisDto(
    int EmpresasActivas,
    int AlumnosContratados,
    int ContratacionesVigentes,
    int ContratacionesVencidas,
    decimal PuntosGenerados,
    decimal PuntosUtilizados,
    decimal PuntosDisponibles,
    decimal PuntosProximosAVencer,
    decimal PuntosVencidos,
    int CanjesRealizados,
    int BeneficiosDisponibles);

public record DashboardOverviewDto(
    DashboardKpisDto Kpis,
    IReadOnlyList<DashboardEmpresaFilaDto> FilasEmpresa,
    DashboardDistribucionDto Distribucion,
    DashboardCalculoDto Calculo);

public record DashboardEmpresaFilaDto(
    int EmpresaId,
    string Empresa,
    int Alumnos,
    int Nuevos,
    int Contrataciones,
    decimal PuntosGenerados,
    int Vigentes,
    int Vencidas,
    int Canjes,
    decimal PuntosCanjeados,
    decimal PuntosDisponibles,
    decimal PuntosPorCanje);

public record DashboardDistribucionDto(
    DashboardDistribucionItemDto Vigentes,
    DashboardDistribucionItemDto Canjes,
    DashboardDistribucionItemDto Vencidas,
    int TotalOperaciones);

public record DashboardDistribucionItemDto(
    string Etiqueta,
    int Cantidad,
    decimal Porcentaje,
    decimal Puntos,
    decimal CostoUnitario);

public record DashboardCalculoDto(
    decimal PuntosGenerados,
    decimal PuntosCanjeados,
    decimal PuntosVencidos,
    decimal SaldoNeto);
