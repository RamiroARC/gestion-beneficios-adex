using GestionBeneficios.Application.Abstractions;

namespace GestionBeneficios.Infrastructure.Crm;

internal static class CrmAlumnoMapper
{
    public static CrmAlumnoDto FromApiItem(CrmAlumnoApiItem item)
    {
        var nombres = JoinParts(item.PrimerNombre, item.SegundoNombre);
        var apellidos = JoinParts(item.Apellido, item.ApellidoPrefijo);

        return new CrmAlumnoDto(
            CodAlumno: (item.CodAlumno ?? string.Empty).Trim(),
            Dni: (item.Dni ?? string.Empty).Trim(),
            Nombres: nombres,
            Apellidos: apellidos,
            Carrera: Normalize(item.Carrera),
            Ciclo: item.CicloActual?.ToString(),
            Telefono: Normalize(item.Telefono),
            Correo: Normalize(item.Email),
            EmailPersonal: Normalize(item.EmailPersonal),
            Modalidad: Normalize(item.Modalidad),
            FechaNacimiento: ParseDate(item.FecNac),
            Denominacion: Normalize(item.Denominacion),
            CrmCreatedOn: DateTime.UtcNow);
    }

    private static string JoinParts(params string?[] parts)
    {
        var joined = string.Join(" ", parts
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p!.Trim()));
        return joined;
    }

    private static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }

    private static DateTime? ParseDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
            return DateTime.SpecifyKind(dt.ToUniversalTime(), DateTimeKind.Utc);
        return null;
    }
}
