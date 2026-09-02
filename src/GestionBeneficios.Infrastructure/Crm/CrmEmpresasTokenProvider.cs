using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GestionBeneficios.Infrastructure.Crm;

public sealed class CrmEmpresasTokenProvider(
    IHttpClientFactory httpClientFactory,
    IOptions<CrmEmpresasOptions> options,
    ILogger<CrmEmpresasTokenProvider> logger)
{
    private readonly SemaphoreSlim _lock = new(1, 1);
    private string? _cachedToken;

    public async Task<string> GetTokenAsync(CancellationToken ct = default, bool forceRefresh = false)
    {
        if (!forceRefresh && !string.IsNullOrWhiteSpace(_cachedToken))
            return _cachedToken!;

        await _lock.WaitAsync(ct);
        try
        {
            if (!forceRefresh && !string.IsNullOrWhiteSpace(_cachedToken))
                return _cachedToken!;

            var cfg = options.Value;
            if (string.IsNullOrWhiteSpace(cfg.CodUser))
                throw new InvalidOperationException("CrmEmpresas:CodUser no está configurado.");

            var client = httpClientFactory.CreateClient(CrmEmpresasHttpClient.AuthHttpClientName);
            var payload = new CrmLoginRequest { CodUser = cfg.CodUser.Trim() };
            using var response = await client.PostAsJsonAsync("/api/auth/login", payload, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"No se pudo autenticar en CRM de Empresas ({(int)response.StatusCode}): {body}");

            var login = JsonSerializer.Deserialize<CrmLoginResponse>(body);
            if (string.IsNullOrWhiteSpace(login?.Token))
                throw new InvalidOperationException("El CRM de Empresas no devolvió un token válido.");

            _cachedToken = login.Token;
            logger.LogInformation("Token CRM de Empresas obtenido correctamente.");
            return _cachedToken;
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Invalidate() => _cachedToken = null;
}
