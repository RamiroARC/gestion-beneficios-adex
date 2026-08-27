namespace GestionBeneficios.Domain.Entities;

public class EmpresaAsociada
{
    public int EmpresaId { get; set; }
    public string CrmEmpresaId { get; set; } = string.Empty;
    public string Ruc { get; set; } = string.Empty;
    public string RazonSocial { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime UltimaSyncUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Contratacion> Contrataciones { get; set; } = new List<Contratacion>();
    public ICollection<PuntoMovimiento> Movimientos { get; set; } = new List<PuntoMovimiento>();
    public ICollection<Canje> Canjes { get; set; } = new List<Canje>();
}

public class Alumno
{
    public int AlumnoId { get; set; }
    public string CodigoAlumno { get; set; } = string.Empty;
    public string Nombres { get; set; } = string.Empty;
    public string Apellidos { get; set; } = string.Empty;
    public string? Carrera { get; set; }
    public string? Ciclo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public DateTime CreadoUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Contratacion> Contrataciones { get; set; } = new List<Contratacion>();
}

public class Sectorista
{
    public int SectoristaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Correo { get; set; }
    public bool Activo { get; set; } = true;
}

public class Contratacion
{
    public int ContratacionId { get; set; }
    public int EmpresaId { get; set; }
    public int AlumnoId { get; set; }
    public int? SectoristaId { get; set; }
    public int Anio { get; set; }
    public string? Categoria { get; set; }
    public string? PerfilSolicitado { get; set; }
    public int MesContratacion { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly FechaFin { get; set; }
    public decimal Sueldo { get; set; }
    public Enums.EstadoContratacion Estado { get; set; } = Enums.EstadoContratacion.Vigente;
    public decimal PuntosGenerados { get; set; }
    public DateTime CreadoUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ActualizadoUtc { get; set; }

    public EmpresaAsociada Empresa { get; set; } = null!;
    public Alumno Alumno { get; set; } = null!;
    public Sectorista? Sectorista { get; set; }
    public ICollection<PuntoMovimiento> Movimientos { get; set; } = new List<PuntoMovimiento>();
}

public class PuntoLote
{
    public int LoteId { get; set; }
    public int EmpresaId { get; set; }
    public int ContratacionId { get; set; }
    public decimal PuntosOriginales { get; set; }
    public decimal PuntosDisponibles { get; set; }
    public DateOnly FechaVencimiento { get; set; }
    public DateTime CreadoUtc { get; set; } = DateTime.UtcNow;
}

public class PuntoMovimiento
{
    public long MovimientoId { get; set; }
    public int EmpresaId { get; set; }
    public int? ContratacionId { get; set; }
    public int? CanjeId { get; set; }
    public int? LoteId { get; set; }
    public Enums.TipoPuntoMovimiento Tipo { get; set; }
    public decimal Puntos { get; set; }
    public DateTime FechaMovimientoUtc { get; set; } = DateTime.UtcNow;
    public DateOnly? FechaVencimiento { get; set; }
    public Enums.EstadoPuntoMovimiento Estado { get; set; } = Enums.EstadoPuntoMovimiento.Disponible;
    public string IdempotencyKey { get; set; } = string.Empty;
    public string? Observacion { get; set; }
}

public class Beneficio
{
    public int BeneficioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Tipo { get; set; }
    public decimal CostoPuntos { get; set; }
    public bool Activo { get; set; } = true;
}

public class Canje
{
    public int CanjeId { get; set; }
    public int EmpresaId { get; set; }
    public int BeneficioId { get; set; }
    public decimal PuntosUsados { get; set; }
    public Enums.EstadoCanje Estado { get; set; } = Enums.EstadoCanje.Procesado;
    public DateTime FechaSolicitudUtc { get; set; } = DateTime.UtcNow;
    public DateTime? FechaProcesoUtc { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string? SolicitadoPor { get; set; }

    public Beneficio Beneficio { get; set; } = null!;
    public EmpresaAsociada Empresa { get; set; } = null!;
}

public class PlantillaCorreo
{
    public int PlantillaId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Asunto { get; set; } = string.Empty;
    public string CuerpoHtml { get; set; } = string.Empty;
    public string? Variables { get; set; }
    public bool Activo { get; set; } = true;
}

public class CorreoEnviado
{
    public long CorreoId { get; set; }
    public int? PlantillaId { get; set; }
    public string Destinatario { get; set; } = string.Empty;
    public string Asunto { get; set; } = string.Empty;
    public string CuerpoHtml { get; set; } = string.Empty;
    public Enums.EstadoCorreo Estado { get; set; } = Enums.EstadoCorreo.Pendiente;
    public int Intentos { get; set; }
    public string? Error { get; set; }
    public DateTime CreadoUtc { get; set; } = DateTime.UtcNow;
    public DateTime? EnviadoUtc { get; set; }
}

public class CargaMasiva
{
    public int CargaId { get; set; }
    public string NombreArchivo { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public Enums.EstadoCargaMasiva Estado { get; set; } = Enums.EstadoCargaMasiva.Validando;
    public int TotalFilas { get; set; }
    public int FilasValidas { get; set; }
    public int FilasInvalidas { get; set; }
    public int FilasProcesadas { get; set; }
    public DateTime CreadoUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletadoUtc { get; set; }

    public ICollection<CargaMasivaDetalle> Detalles { get; set; } = new List<CargaMasivaDetalle>();
}

public class CargaMasivaDetalle
{
    public long DetalleId { get; set; }
    public int CargaId { get; set; }
    public int NumeroFila { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public bool EsValido { get; set; }
    public string? Errores { get; set; }
    public bool Procesado { get; set; }
}

public class AuditoriaEvento
{
    public long AuditoriaId { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public DateTime FechaUtc { get; set; } = DateTime.UtcNow;
    public string Accion { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public string? EntidadId { get; set; }
    public string? ValorAnterior { get; set; }
    public string? ValorNuevo { get; set; }
}

public class ConfiguracionSistema
{
    public int ConfiguracionId { get; set; }
    public string Clave { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
}
