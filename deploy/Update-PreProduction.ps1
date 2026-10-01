<#
.SYNOPSIS
    Actualiza una instalacion EXISTENTE de Gestion de Beneficios ADEX en IIS (PreProduction).

.DESCRIPTION
    Script para ejecutar EN EL SERVIDOR cuando ya se hizo el despliegue inicial con
    Deploy-PreProduction.ps1 y solo se necesita publicar una nueva version del codigo.

    A diferencia del despliegue inicial, este script NO recrea IIS ni toca el Application Pool,
    el sitio, los bindings ni las variables de entorno. Solo:
      1. Detiene el sitio y el Application Pool.
      2. Respalda la version actual (para poder revertir).
      3. Reemplaza el backend y el frontend con los nuevos artefactos.
      4. Reinicia el sitio y verifica el health endpoint.

    Los secretos (connection string, JWT key) NO se tocan: siguen configurados en el
    Application Pool desde el despliegue inicial.

    Cambios de esquema: si la nueva version incluye una migracion EF Core nueva, la API la
    aplica automaticamente al arrancar (MigrateAsync). No requiere accion manual aqui.

.NOTES
    - Ejecutar en PowerShell COMO ADMINISTRADOR en el servidor.
    - Requiere que el sitio ya exista (creado por Deploy-PreProduction.ps1).

.EXAMPLE
    .\Update-PreProduction.ps1 -PublishSource ".\publish" -FrontendSource ".\frontend"

.EXAMPLE
    # Simulacion sin aplicar cambios
    .\Update-PreProduction.ps1 -WhatIf
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    # Origen del backend publicado nuevo.
    [string] $PublishSource = ".\publish",

    # Origen del frontend Angular compilado nuevo.
    [string] $FrontendSource = ".\frontend",

    # Carpeta del sitio ya desplegado (debe coincidir con el despliegue inicial).
    [string] $SitePath = "C:\inetpub\sites\gestion-beneficios",

    # Nombre del sitio y del Application Pool existentes.
    [string] $SiteName = "GestionBeneficios",
    [string] $AppPoolName = "GestionBeneficiosPool",

    # Carpeta donde se guardan los respaldos de versiones anteriores.
    [string] $BackupRoot = "C:\deploy\backups",

    # URL para verificar salud tras la actualizacion. En este servidor la app corre en HTTP
    # puerto 9020; si tu entorno usa HTTPS en 443, pasar -HealthUrl "https://localhost/api/health".
    [string] $HealthUrl = "http://localhost:9020/api/health"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "  [!] $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 0. Verificaciones previas
# ---------------------------------------------------------------------------
Write-Step "Verificando prerrequisitos"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw "Este script debe ejecutarse en una consola de PowerShell ELEVADA (Administrador)."
}
Write-Ok "Ejecutando como Administrador"

Import-Module WebAdministration

# El sitio debe existir (si no, usar Deploy-PreProduction.ps1 para el primer despliegue)
if (-not (Test-Path "IIS:\Sites\$SiteName")) {
    throw "El sitio '$SiteName' no existe. Para el primer despliegue usar Deploy-PreProduction.ps1."
}
Write-Ok "Sitio '$SiteName' encontrado"

if (-not (Test-Path (Join-Path $PublishSource "GestionBeneficios.Api.dll"))) {
    throw "PublishSource no contiene GestionBeneficios.Api.dll: $PublishSource"
}
Write-Ok "Artefacto backend encontrado"

$hasFrontend = Test-Path $FrontendSource
if (-not $hasFrontend) { Write-Warn "No se encuentra FrontendSource: $FrontendSource. Solo se actualizara el backend." }

# ---------------------------------------------------------------------------
# 1. Detener el sitio y el Application Pool
# ---------------------------------------------------------------------------
Write-Step "Deteniendo el sitio"

if ($PSCmdlet.ShouldProcess($SiteName, "Detener sitio y Application Pool")) {
    Stop-WebSite -Name $SiteName -ErrorAction SilentlyContinue
    if ((Get-WebAppPoolState -Name $AppPoolName).Value -ne "Stopped") {
        Stop-WebAppPool -Name $AppPoolName
    }
    # Esperar a que el proceso libere los archivos (ANCM in-process)
    Start-Sleep -Seconds 3
    Write-Ok "Sitio y Application Pool detenidos"
}

# ---------------------------------------------------------------------------
# 2. Respaldar la version actual
# ---------------------------------------------------------------------------
Write-Step "Respaldando la version actual"

if ($PSCmdlet.ShouldProcess($SitePath, "Respaldar version actual")) {
    if (Test-Path $SitePath) {
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupPath = Join-Path $BackupRoot "gestion-beneficios_$stamp"
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        # Copiar el sitio actual excepto la carpeta de logs (para no inflar el respaldo)
        Copy-Item -Path (Join-Path $SitePath "*") -Destination $backupPath -Recurse -Force -Exclude "logs"
        Write-Ok "Respaldo creado en: $backupPath"
    } else {
        Write-Warn "No existe $SitePath; no hay nada que respaldar (se creara al copiar)."
    }
}

# ---------------------------------------------------------------------------
# 3. Reemplazar backend
# ---------------------------------------------------------------------------
Write-Step "Actualizando backend"

if ($PSCmdlet.ShouldProcess($SitePath, "Reemplazar binarios del backend")) {
    New-Item -ItemType Directory -Path $SitePath -Force | Out-Null

    # Borrar binarios y archivos raiz anteriores, preservando wwwroot y logs
    Get-ChildItem -Path $SitePath -Force |
        Where-Object { $_.Name -notin @("wwwroot", "logs") } |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Copy-Item -Path (Join-Path $PublishSource "*") -Destination $SitePath -Recurse -Force

    # Asegurar carpeta de logs
    $logsPath = Join-Path $SitePath "logs"
    New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
    Write-Ok "Backend actualizado en $SitePath"
}

# ---------------------------------------------------------------------------
# 4. Reemplazar frontend
# ---------------------------------------------------------------------------
if ($hasFrontend) {
    Write-Step "Actualizando frontend"
    if ($PSCmdlet.ShouldProcess($SitePath, "Reemplazar frontend en wwwroot")) {
        $wwwroot = Join-Path $SitePath "wwwroot"
        if (Test-Path $wwwroot) { Remove-Item -Path (Join-Path $wwwroot "*") -Recurse -Force -ErrorAction SilentlyContinue }
        New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null
        Copy-Item -Path (Join-Path $FrontendSource "*") -Destination $wwwroot -Recurse -Force
        Write-Ok "Frontend actualizado en $wwwroot"
    }
}

# ---------------------------------------------------------------------------
# 5. Reiniciar y verificar
# ---------------------------------------------------------------------------
Write-Step "Reiniciando el sitio"

if ($PSCmdlet.ShouldProcess($SiteName, "Iniciar App Pool y sitio")) {
    Start-WebAppPool -Name $AppPoolName
    Start-WebSite -Name $SiteName
    Write-Ok "Sitio y Application Pool iniciados"

    Write-Step "Verificando health endpoint"
    Start-Sleep -Seconds 8   # dar tiempo al arranque (posible MigrateAsync de nuevas migraciones)
    try {
        # -SkipCertificateCheck solo existe en PowerShell 7+ y solo aplica a HTTPS.
        $iwrArgs = @{ Uri = $HealthUrl; UseBasicParsing = $true; TimeoutSec = 30 }
        if ($PSVersionTable.PSVersion.Major -ge 6 -and $HealthUrl -like "https:*") {
            $iwrArgs["SkipCertificateCheck"] = $true
        }
        $resp = Invoke-WebRequest @iwrArgs
        Write-Ok "Health respondio: HTTP $($resp.StatusCode)"
    } catch {
        Write-Warn "No se pudo verificar el health en $HealthUrl : $($_.Exception.Message)"
        Write-Warn "Revisar logs en $SitePath\logs. Si algo fallo, se puede revertir copiando el respaldo mas reciente de $BackupRoot."
    }
}

Write-Host "`nActualizacion completada." -ForegroundColor Cyan
Write-Host "Respaldos disponibles en: $BackupRoot" -ForegroundColor Cyan
