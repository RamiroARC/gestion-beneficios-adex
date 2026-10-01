<#
.SYNOPSIS
    Verifica (sin aplicar cambios) que el servidor cumpla los prerrequisitos para desplegar
    Gestion de Beneficios ADEX en IIS (PreProduction).

.DESCRIPTION
    Script de SOLO LECTURA para ejecutar EN EL SERVIDOR antes de correr Deploy-PreProduction.ps1.
    No modifica nada: solo comprueba y reporta. Valida:
      - Consola elevada (Administrador)
      - Rol Web Server (IIS) / modulo WebAdministration
      - ASP.NET Core Hosting Bundle (modulo AspNetCoreModuleV2)
      - Certificado TLS por thumbprint (si se indica) y su vigencia
      - Conectividad TCP al servidor SQL (host:puerto)
      - Presencia de los artefactos del paquete (publish\ y frontend\)
      - Si el sitio/App Pool ya existen (para decidir Deploy vs Update)

    Al final imprime un resumen y sugiere el siguiente paso.

.NOTES
    - Ejecutar en PowerShell COMO ADMINISTRADOR en el servidor.
    - No requiere secretos. La conectividad SQL se prueba solo a nivel TCP (no autentica).

.EXAMPLE
    .\Check-Prerequisites.ps1 -SqlHost "10.31.1.220" -CertificateThumbprint "ABC123..."

.EXAMPLE
    .\Check-Prerequisites.ps1 -PublishSource ".\publish" -FrontendSource ".\frontend" -SqlHost "10.31.1.220"
#>

[CmdletBinding()]
param(
    # Origen del backend publicado dentro del paquete.
    [string] $PublishSource = ".\publish",

    # Origen del frontend Angular compilado dentro del paquete.
    [string] $FrontendSource = ".\frontend",

    # Host del servidor SQL (para test de conectividad TCP). Vacio = no se prueba.
    [string] $SqlHost = "",

    # Puerto del servidor SQL.
    [int]    $SqlPort = 1433,

    # Thumbprint del certificado TLS a verificar. Vacio = no se verifica.
    [string] $CertificateThumbprint = "",

    # Nombre del sitio y del Application Pool (para detectar si ya existen).
    [string] $SiteName = "GestionBeneficios",
    [string] $AppPoolName = "GestionBeneficiosPool"
)

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "  [!]    $msg" -ForegroundColor Yellow }
function Write-Fail($msg)  { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

# ---------------------------------------------------------------------------
# 1. Consola elevada
# ---------------------------------------------------------------------------
Write-Step "Permisos de la consola"
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) { Write-Ok "Ejecutando como Administrador" }
else { Write-Fail "NO es consola elevada. Abrir PowerShell como Administrador."; $issues.Add("Consola no elevada") }

# ---------------------------------------------------------------------------
# 2. IIS / WebAdministration
# ---------------------------------------------------------------------------
Write-Step "IIS (modulo WebAdministration)"
if (Get-Module -ListAvailable -Name WebAdministration) {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Write-Ok "Modulo WebAdministration disponible"
} else {
    Write-Fail "No se encuentra WebAdministration. Instalar el rol Web Server (IIS)."
    $issues.Add("IIS / WebAdministration ausente")
}

# ---------------------------------------------------------------------------
# 3. ASP.NET Core Hosting Bundle (AspNetCoreModuleV2)
# ---------------------------------------------------------------------------
Write-Step "ASP.NET Core Hosting Bundle (.NET 10)"
try {
    $ancm = Get-WebGlobalModule -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "AspNetCoreModuleV2" }
    if ($ancm) { Write-Ok "AspNetCoreModuleV2 presente" }
    else {
        Write-Fail "AspNetCoreModuleV2 no detectado. Instalar el Hosting Bundle .NET 10 y luego 'iisreset'."
        $issues.Add("Hosting Bundle (AspNetCoreModuleV2) ausente")
    }
} catch {
    Write-Warn "No se pudo consultar modulos globales de IIS: $($_.Exception.Message)"
    $warnings.Add("No se verifico AspNetCoreModuleV2")
}

# runtime .NET visible (informativo)
try {
    $runtimes = & dotnet --list-runtimes 2>$null
    $aspnet10 = $runtimes | Where-Object { $_ -like "Microsoft.AspNetCore.App 10.*" }
    if ($aspnet10) { Write-Ok "Runtime ASP.NET Core 10 visible: $($aspnet10 | Select-Object -First 1)" }
    else { Write-Warn "No se vio 'Microsoft.AspNetCore.App 10.*' via 'dotnet --list-runtimes' (el Hosting Bundle in-process igual puede bastar)." }
} catch {
    Write-Warn "No se pudo ejecutar 'dotnet --list-runtimes' (puede no estar en PATH; no es bloqueante)."
}

# ---------------------------------------------------------------------------
# 4. Certificado TLS
# ---------------------------------------------------------------------------
Write-Step "Certificado TLS"
if ($CertificateThumbprint) {
    $thumb = $CertificateThumbprint -replace '\s', ''
    $cert = Get-ChildItem Cert:\LocalMachine\My -ErrorAction SilentlyContinue |
        Where-Object { $_.Thumbprint -eq $thumb }
    if ($cert) {
        Write-Ok "Certificado encontrado: $($cert.Subject)"
        if ($cert.NotAfter -lt (Get-Date)) {
            Write-Fail "El certificado EXPIRO el $($cert.NotAfter)."
            $issues.Add("Certificado expirado")
        } elseif ($cert.NotAfter -lt (Get-Date).AddDays(30)) {
            Write-Warn "El certificado vence pronto: $($cert.NotAfter)."
            $warnings.Add("Certificado proximo a vencer")
        } else {
            Write-Ok "Vigente hasta $($cert.NotAfter)"
        }
    } else {
        Write-Fail "No se encontro un certificado con thumbprint '$thumb' en Cert:\LocalMachine\My."
        $issues.Add("Certificado no encontrado por thumbprint")
    }
} else {
    Write-Warn "Sin -CertificateThumbprint: no se verifico el certificado. HTTPS no se configurara sin el."
    $warnings.Add("Thumbprint de certificado no indicado")
    Write-Host "        Certificados disponibles en LocalMachine\My:" -ForegroundColor DarkGray
    Get-ChildItem Cert:\LocalMachine\My -ErrorAction SilentlyContinue |
        Select-Object Subject, Thumbprint, NotAfter | Format-Table -AutoSize | Out-String | Write-Host -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 5. Conectividad al servidor SQL
# ---------------------------------------------------------------------------
Write-Step "Conectividad al servidor SQL"
if ($SqlHost) {
    try {
        $t = Test-NetConnection -ComputerName $SqlHost -Port $SqlPort -WarningAction SilentlyContinue
        if ($t.TcpTestSucceeded) { Write-Ok "TCP ${SqlHost}:${SqlPort} alcanzable" }
        else {
            Write-Fail "No hay conectividad TCP a ${SqlHost}:${SqlPort}. Revisar firewall/red/instancia SQL."
            $issues.Add("Sin conectividad TCP a SQL ($SqlHost`:$SqlPort)")
        }
    } catch {
        Write-Warn "No se pudo probar la conectividad: $($_.Exception.Message)"
        $warnings.Add("No se verifico conectividad SQL")
    }
} else {
    Write-Warn "Sin -SqlHost: no se probo la conectividad al servidor de base de datos."
    $warnings.Add("Host SQL no indicado")
}

# ---------------------------------------------------------------------------
# 6. Artefactos del paquete
# ---------------------------------------------------------------------------
Write-Step "Artefactos del paquete"
if (Test-Path (Join-Path $PublishSource "GestionBeneficios.Api.dll")) {
    Write-Ok "Backend: GestionBeneficios.Api.dll encontrado en $PublishSource"
} else {
    Write-Fail "No se encuentra GestionBeneficios.Api.dll en $PublishSource."
    $issues.Add("Backend publicado ausente")
}
if (Test-Path (Join-Path $PublishSource "web.config")) { Write-Ok "web.config presente" }
else { Write-Warn "web.config no encontrado en $PublishSource (ANCM lo necesita)."; $warnings.Add("web.config ausente") }

if (Test-Path (Join-Path $FrontendSource "index.html")) {
    Write-Ok "Frontend: index.html encontrado en $FrontendSource"
} else {
    Write-Warn "No se encuentra index.html en $FrontendSource. El SPA no se servira hasta copiarlo."
    $warnings.Add("Frontend (index.html) ausente")
}

# ---------------------------------------------------------------------------
# 7. Estado actual en IIS (Deploy vs Update)
# ---------------------------------------------------------------------------
Write-Step "Estado actual en IIS"
$siteExists = $false
$poolExists = $false
try {
    $siteExists = Test-Path "IIS:\Sites\$SiteName"
    $poolExists = Test-Path "IIS:\AppPools\$AppPoolName"
} catch { }
if ($siteExists) { Write-Ok "El sitio '$SiteName' YA existe" } else { Write-Warn "El sitio '$SiteName' no existe (primer despliegue)" }
if ($poolExists) { Write-Ok "El Application Pool '$AppPoolName' YA existe" } else { Write-Warn "El Application Pool '$AppPoolName' no existe (primer despliegue)" }

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
Write-Step "Resumen"
if ($issues.Count -eq 0) {
    Write-Host "  Sin bloqueos criticos." -ForegroundColor Green
} else {
    Write-Host "  Bloqueos criticos ($($issues.Count)):" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
if ($warnings.Count -gt 0) {
    Write-Host "  Advertencias ($($warnings.Count)):" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
}

Write-Host ""
if ($issues.Count -gt 0) {
    Write-Host "Resolver los bloqueos antes de desplegar." -ForegroundColor Red
} elseif ($siteExists) {
    Write-Host "Siguiente paso sugerido: ACTUALIZACION -> Update-PreProduction.ps1 (-WhatIf primero)." -ForegroundColor Cyan
} else {
    Write-Host "Siguiente paso sugerido: PRIMER DESPLIEGUE -> Deploy-PreProduction.ps1 (-WhatIf primero)." -ForegroundColor Cyan
}
