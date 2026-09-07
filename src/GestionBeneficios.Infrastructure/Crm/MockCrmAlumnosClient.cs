using GestionBeneficios.Application.Abstractions;

namespace GestionBeneficios.Infrastructure.Crm;

public class MockCrmAlumnosClient : ICrmAlumnosClient
{
    private static readonly DateTime Base = new(2026, 9, 1, 12, 0, 0, DateTimeKind.Utc);

    private static readonly List<CrmAlumnoDto> Seed =
    [
        new(
            CodAlumno: "000349212",
            Dni: "75373356",
            Nombres: "DANIELA RUBI",
            Apellidos: "ALDAZ SANTOS",
            Carrera: "Admin.y Gest.de Negocios Internacionales",
            Ciclo: "3",
            Telefono: "940055806",
            Correo: "000349212@adexperu.edu.pe",
            EmailPersonal: "daniela.santos.rubi123@gmail.com",
            Modalidad: "Presencial",
            FechaNacimiento: new DateTime(2004, 12, 3, 0, 0, 0, DateTimeKind.Utc),
            Denominacion: "Escuela Adex",
            CrmCreatedOn: Base.AddHours(1)),
        new(
            CodAlumno: "000346718",
            Dni: "60944777",
            Nombres: "PIERO STEVEN",
            Apellidos: "SERON ROMAN",
            Carrera: "ADM. DE NEGOCIOS INTERNACIONALES",
            Ciclo: "4",
            Telefono: "984357221",
            Correo: "000346718@adexperu.edu.pe",
            EmailPersonal: "pieroseron1@gmail.com",
            Modalidad: "Presencial",
            FechaNacimiento: new DateTime(2006, 12, 20, 0, 0, 0, DateTimeKind.Utc),
            Denominacion: "Escuela Adex",
            CrmCreatedOn: Base.AddHours(4)),
        new(
            CodAlumno: "000350001",
            Dni: "71234567",
            Nombres: "MARIA ELENA",
            Apellidos: "TORRES QUISPE",
            Carrera: "Comercio Exterior",
            Ciclo: "2",
            Telefono: "999111222",
            Correo: "000350001@adexperu.edu.pe",
            EmailPersonal: null,
            Modalidad: "Virtual",
            FechaNacimiento: new DateTime(2005, 5, 10, 0, 0, 0, DateTimeKind.Utc),
            Denominacion: "Escuela Adex",
            CrmCreatedOn: Base.AddDays(1))
    ];

    public Task<IReadOnlyList<CrmAlumnoDto>> SearchAsync(string? query, CancellationToken ct = default)
    {
        IEnumerable<CrmAlumnoDto> q = Seed;
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x =>
                x.Dni.Contains(t, StringComparison.OrdinalIgnoreCase) ||
                x.CodAlumno.Contains(t, StringComparison.OrdinalIgnoreCase) ||
                x.Nombres.Contains(t, StringComparison.OrdinalIgnoreCase) ||
                x.Apellidos.Contains(t, StringComparison.OrdinalIgnoreCase));
        }
        return Task.FromResult<IReadOnlyList<CrmAlumnoDto>>(q.ToList());
    }

    public Task<IReadOnlyList<CrmAlumnoDto>> SearchByPeriodAsync(DateTime inicioUtc, DateTime finUtc, CancellationToken ct = default)
    {
        var items = Seed
            .Where(x => x.CrmCreatedOn >= inicioUtc && x.CrmCreatedOn <= finUtc)
            .OrderBy(x => x.CrmCreatedOn)
            .ToList();
        return Task.FromResult<IReadOnlyList<CrmAlumnoDto>>(items);
    }

    public Task<CrmAlumnoDto?> GetByCriterioAsync(string criterio, CancellationToken ct = default)
    {
        var t = criterio.Trim();
        var match = Seed.FirstOrDefault(x =>
            string.Equals(x.Dni, t, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(x.CodAlumno, t, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(match);
    }
}
