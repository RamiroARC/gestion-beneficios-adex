namespace GestionBeneficios.Infrastructure.Crm;

public class CrmEmpresasOptions
{
    public const string SectionName = "CrmEmpresas";

    public string BaseUrl { get; set; } = "https://sistemagestionventasapi.adexperu.edu.pe";
    public string CodUser { get; set; } = string.Empty;
    public int PageSize { get; set; } = 50;
    public bool UseMock { get; set; } = true;
    public int RequestTimeoutSeconds { get; set; } = 60;
}
