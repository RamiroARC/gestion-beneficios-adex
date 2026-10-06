<#
.SYNOPSIS
    Refresca los Alumnos existentes desde el CRM. Pensado para ejecutarse como TAREA PROGRAMADA.

.DESCRIPTION
    NO modifica el backend: solo consume endpoints HTTP existentes.

    El CRM de Alumnos NO expone listado masivo ni filtro por fecha (solo búsqueda puntual por
    DNI o código). Por eso esta tarea aplica la "Opción C":
      1. Recorre los alumnos YA registrados en la base (GET /api/v1/alumnos, paginado).
      2. Reúne el criterio de cada uno (DNI; si no hay, el código de alumno).
      3. Vuelve a sincronizar cada alumno desde el CRM (POST /api/v1/alumnos/sync/{criterio}).

    Nota: refresca los alumnos existentes; NO descubre alumnos nuevos (la API del CRM no
    permite listarlos masivamente). Requiere CrmEmpresas__CodUser configurado en IIS.

.NOTES
    Ejecutar en el servidor. Programado: cada 5 horas (ver Register-ScheduledTasks.ps1).
#>

[CmdletBinding()]
param(
    [string] $BaseUrl    = "http://localhost:9020",
    [string] $UserName   = "scheduler",
    [string] $Role       = "Administrador",
    [string] $LogDir     = "C:\deploy\logs\scheduled-tasks",
    [int]    $PageSize   = 100,
    [int]    $TimeoutSec = 120
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$logFile = Join-Path $LogDir ("sync-alumnos_{0:yyyyMMdd}.log" -f (Get-Date))

function Log($msg) {
    $line = "{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $msg
    Add-Content -Path $logFile -Value $line
    Write-Output $line
}

try {
    Log "=== INICIO refresco Alumnos (Opción C: por DNI/código existentes) ==="

    $tokenBody = @{ userName = $UserName; role = $Role } | ConvertTo-Json
    $tok = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/dev-token" -Method POST `
        -ContentType "application/json" -Body $tokenBody -TimeoutSec $TimeoutSec
    $headers = @{ Authorization = "Bearer $($tok.access_token)" }

    # 1-2. Recorrer alumnos existentes (paginado) y reunir criterios de búsqueda.
    $criterios = New-Object System.Collections.Generic.List[string]
    $page = 1
    while ($true) {
        $resp = Invoke-RestMethod -Uri "$BaseUrl/api/v1/alumnos?page=$page&pageSize=$PageSize" `
            -Headers $headers -TimeoutSec $TimeoutSec
        if (-not $resp.items -or $resp.items.Count -eq 0) { break }
        foreach ($a in $resp.items) {
            $crit = if ($a.dni) { $a.dni } elseif ($a.codigoAlumno) { $a.codigoAlumno } else { $null }
            if ($crit) { $criterios.Add($crit) }
        }
        if ($resp.items.Count -lt $PageSize) { break }
        $page++
    }
    Log "Alumnos a refrescar: $($criterios.Count)"

    # 3. Sincronizar cada alumno desde el CRM (búsqueda puntual).
    $ok = 0; $err = 0
    foreach ($c in $criterios) {
        try {
            $url = "$BaseUrl/api/v1/alumnos/sync/" + [uri]::EscapeDataString($c)
            Invoke-RestMethod -Uri $url -Method POST -Headers $headers -TimeoutSec $TimeoutSec | Out-Null
            $ok++
        }
        catch {
            $err++
            Log "  fallo criterio=$c : $($_.Exception.Message)"
        }
    }

    Log "Refrescados OK=$ok, con error=$err"
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
