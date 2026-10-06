namespace GestionBeneficios.Infrastructure.Email;

/// <summary>
/// Configuración del envío de correo. Todos los valores pueden definirse por variables de
/// entorno (ej. Email__Host, Email__User). Los secretos (User/Password) NO se versionan:
/// se inyectan en el servidor (App Pool de IIS).
/// </summary>
public class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>
    /// "Smtp" para envío real por SMTP; "Logging" (o vacío) para el stub que solo registra en log.
    /// Permite alternar entre buzón de prueba y SMTP real cambiando SOLO configuración.
    /// </summary>
    public string Provider { get; set; } = "Logging";

    // --- Parámetros SMTP (solo si Provider = "Smtp") ---
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;      // secreto
    public string Password { get; set; } = string.Empty;  // secreto
    public bool UseStartTls { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 30;

    // --- Remitente ---
    public string From { get; set; } = string.Empty;      // ej. miusuario@gmail.com
    public string FromName { get; set; } = "Beneficios ADEX";

    /// <summary>
    /// Si tiene valor, TODOS los correos se redirigen a esta dirección (modo prueba),
    /// ignorando el destinatario real. Dejar vacío en producción para enviar al destinatario real.
    /// </summary>
    public string OverrideTo { get; set; } = string.Empty;
}
