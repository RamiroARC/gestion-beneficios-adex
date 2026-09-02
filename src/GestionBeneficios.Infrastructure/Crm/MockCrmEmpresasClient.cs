using GestionBeneficios.Application.Abstractions;

namespace GestionBeneficios.Infrastructure.Crm;

public class MockCrmEmpresasClient : ICrmEmpresasClient
{
    private static readonly DateTime Base = new(2026, 8, 21, 22, 0, 0, DateTimeKind.Utc);

    private static readonly List<CrmEmpresaDto> Seed =
    [
        new("CRM-1001", "20100070970", "ASOCIACION DE EXPORTADORES", "Gremio", true, Base.AddHours(1),
            Telefono: "(01)3483410", Correo: "contacto@adex.example", Promotor: "Leslie Cuba Santos"),
        new("CRM-1002", "20512345678", "GLOBAL LEARNING SAC", "Educacion", true, Base.AddHours(4),
            Correo: "info@glearning.example"),
        new("CRM-1003", "20600987654", "EMPRESA DEMO ASOCIADA SAC", "Manufactura", true, Base.AddHours(8),
            Promotor: "Promotor Demo"),
        new("CRM-1004", "20555444333", "TEXTILES ANDINOS SAC", "Textil", true, Base.AddHours(10)),
        new("CRM-1005", "20444555666", "AGROEXPORT DEL PACIFICO SA", "Agro", true, Base.AddDays(1).AddHours(2),
            Telefono: "(01)5551234", EjecutivoComercial: "Ejecutivo Demo")
    ];

    public Task<IReadOnlyList<CrmEmpresaDto>> SearchAsync(string? query, CancellationToken ct = default)
    {
        IEnumerable<CrmEmpresaDto> q = Seed;
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x => x.Ruc.Contains(t, StringComparison.OrdinalIgnoreCase)
                             || x.RazonSocial.Contains(t, StringComparison.OrdinalIgnoreCase));
        }
        return Task.FromResult<IReadOnlyList<CrmEmpresaDto>>(q.ToList());
    }

    public Task<IReadOnlyList<CrmEmpresaDto>> SearchByPeriodAsync(DateTime inicioUtc, DateTime finUtc, CancellationToken ct = default)
    {
        var items = Seed
            .Where(x => x.CrmCreatedOn >= inicioUtc && x.CrmCreatedOn <= finUtc)
            .OrderBy(x => x.CrmCreatedOn)
            .ToList();
        return Task.FromResult<IReadOnlyList<CrmEmpresaDto>>(items);
    }

    public Task<CrmEmpresaDto?> GetByRucAsync(string ruc, CancellationToken ct = default) =>
        Task.FromResult(Seed.FirstOrDefault(x => string.Equals(x.Ruc, ruc.Trim(), StringComparison.OrdinalIgnoreCase)));
}
