using System.Text.Json.Serialization;

namespace GestionBeneficios.Infrastructure.Crm;

internal sealed class CrmAlumnoApiItem
{
    [JsonPropertyName("codAlumno")]
    public string? CodAlumno { get; set; }

    [JsonPropertyName("primerNombre")]
    public string? PrimerNombre { get; set; }

    [JsonPropertyName("segundoNombre")]
    public string? SegundoNombre { get; set; }

    [JsonPropertyName("apellido")]
    public string? Apellido { get; set; }

    [JsonPropertyName("apellidoPrefijo")]
    public string? ApellidoPrefijo { get; set; }

    [JsonPropertyName("dni")]
    public string? Dni { get; set; }

    [JsonPropertyName("cicloActual")]
    public int? CicloActual { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("emailPersonal")]
    public string? EmailPersonal { get; set; }

    [JsonPropertyName("telefono")]
    public string? Telefono { get; set; }

    [JsonPropertyName("carrera")]
    public string? Carrera { get; set; }

    [JsonPropertyName("modalidad")]
    public string? Modalidad { get; set; }

    [JsonPropertyName("fecNac")]
    public string? FecNac { get; set; }

    [JsonPropertyName("denominacion")]
    public string? Denominacion { get; set; }

    [JsonPropertyName("mensaje")]
    public string? Mensaje { get; set; }
}
