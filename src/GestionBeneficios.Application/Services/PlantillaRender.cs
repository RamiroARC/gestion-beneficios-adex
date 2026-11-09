using System.Text.RegularExpressions;

namespace GestionBeneficios.Application.Services;

/// <summary>
/// Motor simple de plantillas de correo. Reemplaza tokens dentro del asunto o del cuerpo
/// por los valores provistos. Soporta dos delimitadores de token para compatibilidad:
///   - Doble llave:  {{Empresa}}   (formato histórico de las plantillas sembradas)
///   - Una llave:    {Empresa}     (formato que configuran los usuarios en la UI)
/// El nombre del token es case-insensitive. Un token sin valor se reemplaza por cadena vacía.
/// </summary>
public static partial class PlantillaRender
{
    /// <summary>
    /// Catálogo de tags (variables) disponibles por código de plantilla. Lo consume la UI
    /// para ofrecer los tags insertables y sirve como documentación de lo que cada evento
    /// provee al renderizar. La clave es el nombre del tag; el valor es su descripción.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, IReadOnlyList<TagInfo>> CatalogoPorCodigo =
        new Dictionary<string, IReadOnlyList<TagInfo>>(StringComparer.OrdinalIgnoreCase)
        {
            ["CANJE_CONFIRMADO"] =
            [
                new("Codigo", "Código de la plantilla"),
                new("Empresa", "Razón social de la empresa"),
                new("Beneficio", "Nombre del beneficio canjeado"),
                new("Puntos", "Cantidad de puntos usados en el canje"),
                new("SaldoDisponible", "Saldo de puntos disponible tras el canje")
            ],
            ["PUNTOS_ACUMULADOS"] =
            [
                new("Codigo", "Código de la plantilla"),
                new("Empresa", "Razón social de la empresa"),
                new("Puntos", "Puntos acumulados"),
                new("FechaVencimiento", "Fecha de vencimiento de los puntos"),
                new("SaldoDisponible", "Saldo de puntos disponible")
            ],
            ["PUNTOS_POR_VENCER"] =
            [
                new("Codigo", "Código de la plantilla"),
                new("Empresa", "Razón social de la empresa"),
                new("Puntos", "Puntos próximos a vencer"),
                new("FechaVencimiento", "Fecha de vencimiento")
            ],
            ["INFORMACION_BENEFICIOS"] =
            [
                new("Codigo", "Código de la plantilla"),
                new("Empresa", "Razón social de la empresa"),
                new("Beneficios", "Listado de beneficios disponibles"),
                new("SaldoDisponible", "Saldo de puntos disponible")
            ]
        };

    /// <summary>
    /// Reemplaza en <paramref name="plantilla"/> todos los tokens presentes en
    /// <paramref name="valores"/> (en formato {{Token}} o {Token}, case-insensitive).
    /// </summary>
    public static string Render(string? plantilla, IReadOnlyDictionary<string, string> valores)
    {
        if (string.IsNullOrEmpty(plantilla)) return plantilla ?? string.Empty;

        return TokenRegex().Replace(plantilla, m =>
        {
            var nombre = m.Groups["name"].Value.Trim();
            return valores.TryGetValue(nombre, out var v) ? v ?? string.Empty : m.Value;
        });
    }

    // Captura {{Token}} o {Token}; el nombre admite letras, dígitos, guion bajo y punto.
    [GeneratedRegex(@"\{\{?\s*(?<name>[A-Za-z0-9_.]+)\s*\}?\}", RegexOptions.Compiled)]
    private static partial Regex TokenRegex();

    public sealed record TagInfo(string Nombre, string Descripcion);
}
