using System.Net.Http.Headers;
using System.Net.Http.Json;
using GestionBeneficios.Application.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GestionBeneficios.Infrastructure.Crm;

public sealed class CrmAlumnosHttpClient : ICrmAlumnosClient
{
    public const string HttpClientName = "CrmAlumnos";

    private readonly HttpClient _httpClient;
    private readonly CrmEmpresasTokenProvider _tokenProvider;
    private readonly ILogger<CrmAlumnosHttpClient> _logger;

    public CrmAlumnosHttpClient(
        HttpClient httpClient,
        CrmEmpresasTokenProvider tokenProvider,
        IOptions<CrmAlumnosOptions> options,
        ILogger<CrmAlumnosHttpClient> logger)
    {
        _httpClient = httpClient;
        _tokenProvider = tokenProvider;
        _logger = logger;
        _ = options.Value;
    }

    public Task<IReadOnlyList<CrmAlumnoDto>> SearchAsync(string? query, CancellationToken ct = default) =>
        Task.FromException<IReadOnlyList<CrmAlumnoDto>>(ListNotSupported());

    public Task<IReadOnlyList<CrmAlumnoDto>> SearchByPeriodAsync(DateTime inicioUtc, DateTime finUtc, CancellationToken ct = default) =>
        Task.FromException<IReadOnlyList<CrmAlumnoDto>>(ListNotSupported());

    public async Task<CrmAlumnoDto?> GetByCriterioAsync(string criterio, CancellationToken ct = default)
    {
        var trimmed = criterio.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException("El criterio de búsqueda (DNI o código) es obligatorio.");

        var relativeUrl = $"/api/alumnos/buscar/{Uri.EscapeDataString(trimmed)}";
        var response = await SendAuthorizedAsync(relativeUrl, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            response.Dispose();
            _tokenProvider.Invalidate();
            response = await SendAuthorizedAsync(relativeUrl, ct, forceRefreshToken: true);
        }

        using (response)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogInformation("CRM alumnos: no se encontró criterio {Criterio}.", trimmed);
                return null;
            }

            var payload = await response.Content.ReadFromJsonAsync<CrmAlumnoApiItem>(cancellationToken: ct);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"Error al consultar CRM de Alumnos ({(int)response.StatusCode}): {payload?.Mensaje ?? response.ReasonPhrase}");
            }

            if (payload is null || string.IsNullOrWhiteSpace(payload.CodAlumno) && string.IsNullOrWhiteSpace(payload.Dni))
                return null;

            return CrmAlumnoMapper.FromApiItem(payload);
        }
    }

    private static InvalidOperationException ListNotSupported() =>
        new(
            "El CRM de Alumnos no expone listado paginado ni filtro por fecha. " +
            "Use Sync por DNI/código (GET /api/alumnos/buscar/{criterio}). " +
            "Periodo y catálogo completo solo están disponibles con CrmAlumnos:UseMock=true.");

    private async Task<HttpResponseMessage> SendAuthorizedAsync(string relativeUrl, CancellationToken ct, bool forceRefreshToken = false)
    {
        var token = await _tokenProvider.GetTokenAsync(ct, forceRefreshToken);
        using var request = new HttpRequestMessage(HttpMethod.Get, relativeUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _httpClient.SendAsync(request, ct);
    }
}
