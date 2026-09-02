using GestionBeneficios.Application.Abstractions;

namespace GestionBeneficios.Infrastructure.Crm;

internal static class CrmEmpresaMapper
{
    public static CrmEmpresaDto FromApiItem(CrmAsociadoItem item)
    {
        var estado = Normalize(item.SEstado);
        var createdOn = ParseCreatedOn(item.CreatedOn);

        return new CrmEmpresaDto(
            CrmEmpresaId: string.IsNullOrWhiteSpace(item.UIdCuenta) ? Guid.NewGuid().ToString() : item.UIdCuenta.Trim(),
            Ruc: (item.SNumeroDocumento ?? string.Empty).Trim(),
            RazonSocial: (item.SRazonSocial ?? string.Empty).Trim(),
            Categoria: Normalize(item.SCategoria),
            Activo: IsActivo(estado),
            CrmCreatedOn: createdOn,
            EstadoCrm: estado,
            Telefono: Normalize(item.SCentralTelefonica),
            Correo: Normalize(item.SCorreo),
            PaginaWeb: Normalize(item.SPaginaWeb),
            EjecutivoComercial: Normalize(item.SEjecutivoComercial),
            Promotor: Normalize(item.SPromotor),
            Gerencia: Normalize(item.SGerencia),
            Comite: Normalize(item.SComite),
            FechaAltaCrm: Normalize(item.SFechaAlta));
    }

    public static bool IsActivo(string? estadoCrm)
    {
        if (string.IsNullOrWhiteSpace(estadoCrm)) return true;
        var lower = estadoCrm.Trim().ToLowerInvariant();
        return !(lower.Contains("inactiv") || lower.Contains("baja") || lower.Contains("cancel"));
    }

    private static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }

    private static DateTime ParseCreatedOn(string? raw)
    {
        if (DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
            return DateTime.SpecifyKind(dt.ToUniversalTime(), DateTimeKind.Utc);
        return DateTime.UtcNow;
    }
}
