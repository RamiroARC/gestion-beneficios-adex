using System.Net;
using System.Net.Mail;
using GestionBeneficios.Application.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GestionBeneficios.Infrastructure.Email;

/// <summary>
/// Envío real de correo vía SMTP usando System.Net.Mail (sin dependencias externas).
/// Compatible con Gmail / Mailtrap / Office365 (STARTTLS en el puerto 587).
/// Si EmailOptions.OverrideTo está definido, redirige todos los correos a esa dirección
/// (modo prueba). Cambiar de buzón de prueba al SMTP real es solo cambiar configuración.
/// </summary>
public sealed class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    private readonly EmailOptions _opt = options.Value;

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        var destinatarioReal = to;
        var destino = string.IsNullOrWhiteSpace(_opt.OverrideTo) ? to : _opt.OverrideTo;

        if (string.IsNullOrWhiteSpace(_opt.Host) || string.IsNullOrWhiteSpace(_opt.From))
            throw new InvalidOperationException(
                "SMTP no configurado: definir Email__Host y Email__From (y credenciales si el servidor las requiere).");

        using var message = new MailMessage
        {
            From = new MailAddress(_opt.From, _opt.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(destino);

        // Si se redirige por OverrideTo, deja traza del destinatario original en el asunto/cuerpo
        // para no perder la referencia durante las pruebas.
        if (!string.IsNullOrWhiteSpace(_opt.OverrideTo) &&
            !string.Equals(destinatarioReal, _opt.OverrideTo, StringComparison.OrdinalIgnoreCase))
        {
            message.Subject = $"[PRUEBA → {destinatarioReal}] {subject}";
        }

        using var client = new SmtpClient(_opt.Host, _opt.Port)
        {
            EnableSsl = _opt.UseStartTls,
            Timeout = Math.Clamp(_opt.TimeoutSeconds, 5, 300) * 1000,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };

        if (!string.IsNullOrWhiteSpace(_opt.User))
            client.Credentials = new NetworkCredential(_opt.User, _opt.Password);

        await client.SendMailAsync(message, ct);
        logger.LogInformation("EMAIL enviado → {Destino} | {Subject}", destino, message.Subject);
    }
}
