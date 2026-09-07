namespace GestionBeneficios.Infrastructure.Crm;

public class CrmAlumnosOptions
{
    public const string SectionName = "CrmAlumnos";

    public string BaseUrl { get; set; } = "https://sistemagestionventasapi.adexperu.edu.pe";
    public bool UseMock { get; set; } = true;
    public int RequestTimeoutSeconds { get; set; } = 60;
}
