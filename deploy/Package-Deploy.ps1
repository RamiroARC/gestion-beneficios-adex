<#
.SYNOPSIS
    Empaqueta todo lo necesario para el despliegue a PreProduccion en una sola carpeta.

.DESCRIPTION
    Se ejecuta EN LA MAQUINA DE DESARROLLO (tu PC). NO requiere privilegios de administrador.
    Compila el frontend y el backend, y reune los artefactos + el script de despliegue + las
    instrucciones para el administrador dentro de una carpeta autocontenida ('deploy-package'),
    lista para copiar al servidor por escritorio remoto.

    NO contiene secretos: la connection string y la JWT key se pasan al ejecutar el script de
    despliegue en el servidor, no aqui.

.NOTES
    - Ejecutar desde la raiz del repositorio.
    - Requiere: .NET SDK 10 y Node.js (los mismos que ya usas para desarrollar).

.EXAMPLE
    .\deploy\Package-Deploy.ps1
    # Genera .\deploy-package\  con backend, frontend, script e instrucciones.

.EXAMPLE
    .\deploy\Package-Deploy.ps1 -OutputDir "C:\temp\preprod-package"
#>

[CmdletBinding()]
param(
    # Carpeta de salida del paquete. Default: .\deploy-package
    [string] $OutputDir = ".\deploy-package"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot   # carpeta raiz del repo (deploy\ esta un nivel abajo)

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }

Set-Location $repoRoot

# ---------------------------------------------------------------------------
# 1. Compilar frontend (preproduction)
# ---------------------------------------------------------------------------
Write-Step "Compilando frontend (build:preproduction)"
Push-Location (Join-Path $repoRoot "web")
try {
    npm run build:preproduction
    if ($LASTEXITCODE -ne 0) { throw "El build del frontend fallo (exit $LASTEXITCODE)." }
    Write-Ok "Frontend compilado"
} finally {
    Pop-Location
}

$frontendSource = Join-Path $repoRoot "web\dist\gestion-beneficios-web\browser"
if (-not (Test-Path $frontendSource)) {
    throw "No se encontro la salida del frontend en: $frontendSource"
}

# ---------------------------------------------------------------------------
# 2. Publicar backend (Release)
# ---------------------------------------------------------------------------
Write-Step "Publicando backend (dotnet publish -c Release)"
$publishSource = Join-Path $repoRoot "publish"
dotnet publish (Join-Path $repoRoot "src\GestionBeneficios.Api") -c Release -o $publishSource
if ($LASTEXITCODE -ne 0) { throw "El publish del backend fallo (exit $LASTEXITCODE)." }
Write-Ok "Backend publicado en $publishSource"

# ---------------------------------------------------------------------------
# 3. Armar el paquete
# ---------------------------------------------------------------------------
Write-Step "Armando el paquete en $OutputDir"

# Limpiar salida previa
if (Test-Path $OutputDir) { Remove-Item $OutputDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$pkgPublish  = Join-Path $OutputDir "publish"
$pkgFrontend = Join-Path $OutputDir "frontend"
New-Item -ItemType Directory -Path $pkgPublish  -Force | Out-Null
New-Item -ItemType Directory -Path $pkgFrontend -Force | Out-Null

Copy-Item -Path (Join-Path $publishSource  "*") -Destination $pkgPublish  -Recurse -Force
Write-Ok "Backend copiado al paquete"

Copy-Item -Path (Join-Path $frontendSource "*") -Destination $pkgFrontend -Recurse -Force
Write-Ok "Frontend copiado al paquete"

# Script de despliegue e instrucciones para el sysadmin
Copy-Item -Path (Join-Path $repoRoot "deploy\Deploy-PreProduction.ps1")  -Destination $OutputDir -Force
Copy-Item -Path (Join-Path $repoRoot "deploy\INSTRUCCIONES-SYSADMIN.md") -Destination $OutputDir -Force -ErrorAction SilentlyContinue
Write-Ok "Script e instrucciones copiados"

# ---------------------------------------------------------------------------
# 4. Resumen
# ---------------------------------------------------------------------------
Write-Step "Paquete listo"
Write-Host @"
Contenido de '$OutputDir':
  publish\                      -> backend .NET publicado (copiar a C:\deploy\publish en el servidor)
  frontend\                     -> Angular compilado      (copiar a C:\deploy\frontend en el servidor)
  Deploy-PreProduction.ps1      -> script que ejecuta el ADMINISTRADOR en el servidor
  INSTRUCCIONES-SYSADMIN.md     -> guia para el administrador

Siguiente paso:
  1. Copia toda la carpeta '$OutputDir' al servidor por escritorio remoto (ej. a C:\deploy).
  2. Entrega INSTRUCCIONES-SYSADMIN.md al administrador junto con la connection string y JWT key
     (por un canal seguro, NUNCA dentro del paquete ni del repositorio).
"@ -ForegroundColor Cyan
