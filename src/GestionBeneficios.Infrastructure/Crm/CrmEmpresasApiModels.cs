using System.Text.Json.Serialization;

namespace GestionBeneficios.Infrastructure.Crm;

internal sealed class CrmLoginRequest
{
    [JsonPropertyName("codUser")]
    public string CodUser { get; set; } = string.Empty;
}

internal sealed class CrmLoginResponse
{
    [JsonPropertyName("token")]
    public string? Token { get; set; }
}

internal sealed class CrmListarAsociadosResponse
{
    [JsonPropertyName("iCodigo")]
    public int ICodigo { get; set; }

    [JsonPropertyName("sRespuesta")]
    public string? SRespuesta { get; set; }

    [JsonPropertyName("datos")]
    public List<CrmAsociadoItem>? Datos { get; set; }
}

internal sealed class CrmAsociadoItem
{
    [JsonPropertyName("uIdCuenta")]
    public string? UIdCuenta { get; set; }

    [JsonPropertyName("sNumeroDocumento")]
    public string? SNumeroDocumento { get; set; }

    [JsonPropertyName("sRazonSocial")]
    public string? SRazonSocial { get; set; }

    [JsonPropertyName("sCategoria")]
    public string? SCategoria { get; set; }

    [JsonPropertyName("sFechaAlta")]
    public string? SFechaAlta { get; set; }

    [JsonPropertyName("sCentralTelefonica")]
    public string? SCentralTelefonica { get; set; }

    [JsonPropertyName("sCorreo")]
    public string? SCorreo { get; set; }

    [JsonPropertyName("sPaginaWeb")]
    public string? SPaginaWeb { get; set; }

    [JsonPropertyName("sEjecutivoComercial")]
    public string? SEjecutivoComercial { get; set; }

    [JsonPropertyName("sPromotor")]
    public string? SPromotor { get; set; }

    [JsonPropertyName("sGerencia")]
    public string? SGerencia { get; set; }

    [JsonPropertyName("sComite")]
    public string? SComite { get; set; }

    [JsonPropertyName("sEstado")]
    public string? SEstado { get; set; }

    [JsonPropertyName("createdOn")]
    public string? CreatedOn { get; set; }
}
