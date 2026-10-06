<#
.SYNOPSIS
    Sincroniza el catálogo de Empresas desde el CRM. Pensado para ejecutarse como TAREA PROGRAMADA.

.DESCRIPTION
    NO modifica el backend: solo consume el endpoint HTTP existente POST /api/v1/empresas/sync.
    Obtiene un token de autenticación (dev-token) y dispara la sincronización completa del
    catálogo de empresas. Registra el resultado en un log diario.

    Requiere que la API esté arriba (por defecto en http://localhost:9020) y que la variable
    de entorno CrmEmpresas__CodUser esté configurada en el App Pool de IIS; sin ella el CRM
    rechaza la autenticación y el resultado quedará registrado como error en el log.

.NOTES
    Ejecutar en el servidor. Programado: diario a las 02:00 (ver Register-ScheduledTasks.ps1).
#>

[CmdletBinding()]
param(
    [string] $BaseUrl    = "http://localhost:9020",
    [string] $UserName   = "scheduler",
    [string] $Role       = "Administrador",
    [string] $LogDir     = "C:\deploy\logs\scheduled-tasks",
    [int]    $TimeoutSec = 300
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$logFile = Join-Path $LogDir ("sync-empresas_{0:yyyyMMdd}.log" -f (Get-Date))

function Log($msg) {
    $line = "{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $msg
    Add-Content -Path $logFile -Value $line
    Write-Output $line
}

try {
    Log "=== INICIO sincronización Empresas ==="

    $tokenBody = @{ userName = $UserName; role = $Role } | ConvertTo-Json
    $tok = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/dev-token" -Method POST `
        -ContentType "application/json" -Body $tokenBody -TimeoutSec $TimeoutSec
    $headers = @{ Authorization = "Bearer $($tok.access_token)" }

    $r = Invoke-RestMethod -Uri "$BaseUrl/api/v1/empresas/sync" -Method POST `
        -Headers $headers -TimeoutSec $TimeoutSec

    Log ("Resultado: procesadas={0} nuevas={1} actualizadas={2}" -f $r.procesadas, $r.nuevas, $r.actualizadas)
    Log "=== FIN OK ==="
    exit 0
}
catch {
    $detalle = $_.Exception.Message
    try {
        if ($_.Exception.Response) {
            $detalle += " | " + (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
        }
    } catch {}
    Log "ERROR: $detalle"
    exit 1
}
