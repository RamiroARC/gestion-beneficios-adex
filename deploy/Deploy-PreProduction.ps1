<#
.SYNOPSIS
    Despliega Gestion de Beneficios ADEX en un servidor Windows con IIS (ambiente PreProduction).

.DESCRIPTION
    Script para ejecutar EN EL SERVIDOR de preproduccion (no en la maquina de desarrollo).
    Automatiza:
      - Validacion de prerrequisitos (Hosting Bundle, modulo IIS)
      - Copia de artefactos (backend publish + frontend Angular compilado)
      - Creacion/configuracion del Application Pool y el sitio IIS
      - Configuracion de variables de entorno del ambiente (incluye secretos)
      - Arranque del sitio y verificacion del health endpoint

    Los secretos (connection string, JWT key) se pasan como PARAMETROS, nunca se
    almacenan en el repositorio ni quedan escritos en disco por este script.

.NOTES
    - Ejecutar en PowerShell COMO ADMINISTRADOR en el servidor.
    - Requiere el modulo WebAdministration (viene con IIS).
    - Revisar los valores por defecto de parametros antes de ejecutar.

.EXAMPLE
    .\Deploy-PreProduction.ps1 `
        -PublishSource "C:\deploy\publish" `
        -FrontendSource "C:\deploy\frontend" `
        -ConnectionString "Server=10.31.1.220;Database=BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS;User Id=svc_beneficios;Password=****;TrustServerCertificate=True;Encrypt=True" `
        -JwtKey "una-clave-larga-y-segura"

.EXAMPLE
    # Simulacion sin aplicar cambios (revisar que hara)
    .\Deploy-PreProduction.ps1 -ConnectionString "..." -JwtKey "..." -WhatIf
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    # Ruta de origen del backend publicado (salida de 'dotnet publish -c Release -o publish').
    [string] $PublishSource = ".\publish",

    # Ruta de origen del frontend Angular compilado (web/dist/gestion-beneficios-web/browser).
    [string] $FrontendSource = ".\frontend",

    # Carpeta destino del sitio en el servidor.
    [string] $SitePath = "C:\inetpub\sites\gestion-beneficios",

    # Nombre del sitio y del Application Pool en IIS.
    [string] $SiteName = "GestionBeneficios",
    [string] $AppPoolName = "GestionBeneficiosPool",

    # Binding HTTPS. Indicar el thumbprint de un certificado ya instalado en el servidor.
    [int]    $HttpsPort = 443,
    [string] $HostHeader = "",
    [string] $CertificateThumbprint = "",

    # Connection string a SQL Server 2022 (OBLIGATORIO). Contiene secreto: no versionar.
    [Parameter(Mandatory = $true)]
    [string] $ConnectionString,

    # Clave JWT para PreProduction (OBLIGATORIO). Secreto: no versionar.
    [Parameter(Mandatory = $true)]
    [string] $JwtKey,

    # Ambiente ASP.NET Core.
    [string] $AspNetCoreEnvironment = "PreProduction",

    # URL base para la verificacion de salud tras el arranque.
    [string] $HealthUrl = "https://localhost/api/health"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "  [!] $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 0. Verificaciones previas
# ---------------------------------------------------------------------------
Write-Step "Verificando prerrequisitos"

# Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw "Este script debe ejecutarse en una consola de PowerShell ELEVADA (Administrador)."
}
Write-Ok "Ejecutando como Administrador"

# Modulo IIS
if (-not (Get-Module -ListAvailable -Name WebAdministration)) {
    throw "El modulo WebAdministration no esta disponible. Instalar el rol Web Server (IIS)."
}
Import-Module WebAdministration
Write-Ok "Modulo WebAdministration cargado"

# Hosting Bundle / modulo ANCM
$ancm = Get-WebGlobalModule -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "AspNetCoreModuleV2" }
if (-not $ancm) {
    Write-Warn "No se detecto AspNetCoreModuleV2. Instalar el ASP.NET Core Hosting Bundle (.NET 10) y reiniciar IIS (iisreset) antes de continuar."
} else {
    Write-Ok "Modulo AspNetCoreModuleV2 presente"
}

# Origenes
if (-not (Test-Path $PublishSource)) { throw "No se encuentra PublishSource: $PublishSource" }
if (-not (Test-Path (Join-Path $PublishSource "GestionBeneficios.Api.dll"))) {
    throw "PublishSource no contiene GestionBeneficios.Api.dll. Verificar el 'dotnet publish'."
}
Write-Ok "Artefacto backend encontrado"

if (-not (Test-Path $FrontendSource)) {
    Write-Warn "No se encuentra FrontendSource: $FrontendSource. El frontend no se copiara."
} else {
    Write-Ok "Artefacto frontend encontrado"
}

# ---------------------------------------------------------------------------
# 1. Copiar artefactos
# ---------------------------------------------------------------------------
Write-Step "Copiando artefactos al sitio"

if ($PSCmdlet.ShouldProcess($SitePath, "Crear carpeta del sitio y copiar backend")) {
    New-Item -ItemType Directory -Path $SitePath -Force | Out-Null
    # Copia del backend (contenido de publish/)
    Copy-Item -Path (Join-Path $PublishSource "*") -Destination $SitePath -Recurse -Force
    Write-Ok "Backend copiado a $SitePath"

    # Carpeta de logs con permiso de escritura para el App Pool
    $logsPath = Join-Path $SitePath "logs"
    New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
    Write-Ok "Carpeta de logs creada: $logsPath"

    # Frontend a wwwroot (servido como static files por el mismo sitio)
    if (Test-Path $FrontendSource) {
        $wwwroot = Join-Path $SitePath "wwwroot"
        New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null
        Copy-Item -Path (Join-Path $FrontendSource "*") -Destination $wwwroot -Recurse -Force
        Write-Ok "Frontend copiado a $wwwroot"
    }
}

# ---------------------------------------------------------------------------
# 2. Application Pool (.NET CLR = No Managed Code)
# ---------------------------------------------------------------------------
Write-Step "Configurando Application Pool: $AppPoolName"

if ($PSCmdlet.ShouldProcess($AppPoolName, "Crear/configurar Application Pool")) {
    if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
        New-WebAppPool -Name $AppPoolName | Out-Null
        Write-Ok "Application Pool creado"
    } else {
        Write-Warn "El Application Pool ya existe; se reutiliza"
    }
    # No Managed Code (ASP.NET Core corre via ANCM, no usa el CLR del pool)
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedPipelineMode  -Value 0  # Integrated
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode            -Value 1  # AlwaysRunning
    Write-Ok "Application Pool configurado (No Managed Code, Integrated)"
}

# ---------------------------------------------------------------------------
# 3. Sitio IIS + binding HTTPS
# ---------------------------------------------------------------------------
Write-Step "Configurando sitio IIS: $SiteName"

if ($PSCmdlet.ShouldProcess($SiteName, "Crear/configurar sitio IIS")) {
    if (-not (Test-Path "IIS:\Sites\$SiteName")) {
        New-Website -Name $SiteName -PhysicalPath $SitePath -ApplicationPool $AppPoolName -Port 80 -Force | Out-Null
        Write-Ok "Sitio creado (HTTP:80 temporal)"
    } else {
        Write-Warn "El sitio ya existe; se reutiliza"
        Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath      -Value $SitePath
        Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool   -Value $AppPoolName
    }

    # Binding HTTPS si se proporciono certificado
    if ($CertificateThumbprint) {
        $existingHttps = Get-WebBinding -Name $SiteName -Protocol "https" -ErrorAction SilentlyContinue
        if (-not $existingHttps) {
            New-WebBinding -Name $SiteName -Protocol "https" -Port $HttpsPort -HostHeader $HostHeader
            Write-Ok "Binding HTTPS agregado en puerto $HttpsPort"
        }
        # Asociar el certificado al binding
        $binding = Get-WebBinding -Name $SiteName -Protocol "https"
        $binding.AddSslCertificate($CertificateThumbprint, "My")
        Write-Ok "Certificado asociado al binding HTTPS"
    } else {
        Write-Warn "Sin CertificateThumbprint: no se configuro HTTPS. Configurar el binding 443 manualmente."
    }
}

# ---------------------------------------------------------------------------
# 4. Variables de entorno del ambiente (incluye secretos)
# ---------------------------------------------------------------------------
Write-Step "Configurando variables de entorno del Application Pool"

if ($PSCmdlet.ShouldProcess($AppPoolName, "Setear variables de entorno (environmentVariables)")) {
    $envVars = @{
        "ASPNETCORE_ENVIRONMENT"        = $AspNetCoreEnvironment
        "ConnectionStrings__Beneficios" = $ConnectionString
        "Authentication__DevJwt__Key"   = $JwtKey
    }
    # Limpiar coleccion existente y volver a agregar
    Clear-WebConfiguration "system.applicationHost/applicationPools/add[@name='$AppPoolName']/environmentVariables" -ErrorAction SilentlyContinue
    foreach ($k in $envVars.Keys) {
        Add-WebConfiguration "system.applicationHost/applicationPools/add[@name='$AppPoolName']/environmentVariables" `
            -Value @{ name = $k; value = $envVars[$k] }
    }
    Write-Ok "Variables de entorno configuradas (ASPNETCORE_ENVIRONMENT, ConnectionStrings__Beneficios, Authentication__DevJwt__Key)"
    Write-Warn "Los secretos quedan solo en la config de IIS del servidor, no en el repositorio."
}

# ---------------------------------------------------------------------------
# 5. Permisos de la carpeta de logs para la identidad del App Pool
# ---------------------------------------------------------------------------
Write-Step "Aplicando permisos de escritura sobre logs"

if ($PSCmdlet.ShouldProcess($SitePath, "Otorgar permisos al App Pool")) {
    $appPoolIdentity = "IIS AppPool\$AppPoolName"
    $logsPath = Join-Path $SitePath "logs"
    $acl = Get-Acl $logsPath
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $appPoolIdentity, "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
    $acl.SetAccessRule($rule)
    Set-Acl -Path $logsPath -AclObject $acl
    Write-Ok "Permisos de escritura otorgados a $appPoolIdentity sobre logs"
}

# ---------------------------------------------------------------------------
# 6. Arrancar y verificar
# ---------------------------------------------------------------------------
Write-Step "Arrancando el sitio"

if ($PSCmdlet.ShouldProcess($SiteName, "Iniciar App Pool y sitio")) {
    Restart-WebAppPool -Name $AppPoolName
    Start-Website -Name $SiteName -ErrorAction SilentlyContinue
    Write-Ok "Sitio y Application Pool iniciados"

    Write-Step "Verificando health endpoint"
    Start-Sleep -Seconds 8   # dar tiempo al primer arranque (MigrateAsync + seed)
    try {
        $resp = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 30 -SkipCertificateCheck
        Write-Ok "Health respondio: HTTP $($resp.StatusCode)"
    } catch {
        Write-Warn "No se pudo verificar el health en $HealthUrl : $($_.Exception.Message)"
        Write-Warn "Revisar logs en $SitePath\logs. Para diagnostico, activar stdoutLogEnabled='true' en web.config."
    }
}

Write-Host "`nDespliegue completado. Revisar el estado del sitio en IIS Manager." -ForegroundColor Cyan
