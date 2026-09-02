using System.Net.Http.Headers;
using System.Net.Http.Json;
using GestionBeneficios.Application.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GestionBeneficios.Infrastructure.Crm;

public sealed class CrmEmpresasHttpClient : ICrmEmpresasClient
{
    public const string HttpClientName = "CrmEmpresas";
    public const string AuthHttpClientName = "CrmEmpresasAuth";

    private readonly HttpClient _httpClient;
    private readonly CrmEmpresasTokenProvider _tokenProvider;
    private readonly CrmEmpresasOptions _options;
    private readonly ILogger<CrmEmpresasHttpClient> _logger;

    public CrmEmpresasHttpClient(
        HttpClient httpClient,
        CrmEmpresasTokenProvider tokenProvider,
        IOptions<CrmEmpresasOptions> options,
        ILogger<CrmEmpresasHttpClient> logger)
    {
        _httpClient = httpClient;
        _tokenProvider = tokenProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<CrmEmpresaDto>> SearchAsync(string? query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return await ListAllPagesAsync(buscador: null, ct);

        var trimmed = query.Trim();
        var looksLikeRuc = trimmed.All(char.IsDigit) && trimmed.Length is >= 8 and <= 11;
        if (looksLikeRuc)
            return await FetchPageAsync(page: 1, buscador: trimmed, ct);

        var all = await ListAllPagesAsync(buscador: null, ct);
        return all
            .Where(x => x.Ruc.Contains(trimmed, StringComparison.OrdinalIgnoreCase)
                        || x.RazonSocial.Contains(trimmed, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    public async Task<IReadOnlyList<CrmEmpresaDto>> SearchByPeriodAsync(DateTime inicioUtc, DateTime finUtc, CancellationToken ct = default)
    {
        var all = await ListAllPagesAsync(buscador: null, ct);
        var filtered = all
            .Where(x => x.CrmCreatedOn >= inicioUtc && x.CrmCreatedOn <= finUtc)
            .OrderBy(x => x.CrmCreatedOn)
            .ToList();

        _logger.LogInformation(
            "CRM periodo {Inicio:o} → {Fin:o}: {Filtered} de {Total} empresas (filtro createdOn).",
            inicioUtc, finUtc, filtered.Count, all.Count);

        return filtered;
    }

    public async Task<CrmEmpresaDto?> GetByRucAsync(string ruc, CancellationToken ct = default)
    {
        var items = await FetchPageAsync(page: 1, buscador: ruc.Trim(), ct);
        return items.FirstOrDefault(x => string.Equals(x.Ruc, ruc.Trim(), StringComparison.OrdinalIgnoreCase))
               ?? items.FirstOrDefault();
    }

    private async Task<IReadOnlyList<CrmEmpresaDto>> ListAllPagesAsync(string? buscador, CancellationToken ct)
    {
        var pageSize = Math.Clamp(_options.PageSize, 1, 200);
        var page = 1;
        var all = new List<CrmEmpresaDto>();

        while (true)
        {
            var batch = await FetchPageAsync(page, buscador, ct);
            if (batch.Count == 0) break;

            all.AddRange(batch);
            if (batch.Count < pageSize) break;
            page++;
        }

        _logger.LogInformation("CRM listarAsociados: {Pages} página(s), {Total} registro(s).", page, all.Count);
        return all;
    }

    private async Task<IReadOnlyList<CrmEmpresaDto>> FetchPageAsync(int page, string? buscador, CancellationToken ct)
    {
        var pageSize = Math.Clamp(_options.PageSize, 1, 200);
        var query = $"/api/crm-on-premise/listarAsociados?page={page}&pageSize={pageSize}";
        if (!string.IsNullOrWhiteSpace(buscador))
            query += $"&buscador={Uri.EscapeDataString(buscador.Trim())}";

        var response = await SendAuthorizedAsync(query, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            response.Dispose();
            _tokenProvider.Invalidate();
            response = await SendAuthorizedAsync(query, ct, forceRefreshToken: true);
        }

        using (response)
        {
            var payload = await response.Content.ReadFromJsonAsync<CrmListarAsociadosResponse>(cancellationToken: ct);
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"Error al consultar CRM de Empresas ({(int)response.StatusCode}): {payload?.SRespuesta ?? response.ReasonPhrase}");
            }

            if (payload is null || payload.ICodigo != 1)
            {
                throw new InvalidOperationException(
                    payload?.SRespuesta ?? "El CRM de Empresas devolvió una respuesta inválida.");
            }

            return payload.Datos?
                       .Select(CrmEmpresaMapper.FromApiItem)
                       .Where(x => !string.IsNullOrWhiteSpace(x.Ruc))
                       .ToList()
                   ?? [];
        }
    }

    private async Task<HttpResponseMessage> SendAuthorizedAsync(string relativeUrl, CancellationToken ct, bool forceRefreshToken = false)
    {
        var token = await _tokenProvider.GetTokenAsync(ct, forceRefreshToken);
        using var request = new HttpRequestMessage(HttpMethod.Get, relativeUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _httpClient.SendAsync(request, ct);
    }
}
