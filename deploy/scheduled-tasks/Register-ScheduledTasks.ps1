<#
.SYNOPSIS
    Registra en el Programador de tareas de Windows las dos sincronizaciones del CRM.

.DESCRIPTION
    Ejecutar EN EL SERVIDOR, en PowerShell COMO ADMINISTRADOR.
    NO modifica el backend: solo crea dos tareas programadas que invocan los scripts
    Sync-Empresas.ps1 y Sync-Alumnos.ps1 (que a su vez consumen endpoints HTTP existentes).

      - GB-Sync-Empresas : diaria a las 02:00.
      - GB-Sync-Alumnos  : cada 5 horas (arranca 03:00 y se repite indefinidamente).

    Ambas corren como SYSTEM con ExecutionPolicy Bypass. Si las tareas ya existen, se
    actualizan (se eliminan y se vuelven a registrar).

.NOTES
    Requiere que los scripts estén en -ScriptDir (por defecto la carpeta de este archivo).
#>

[CmdletBinding()]
param(
    [string] $ScriptDir   = $PSScriptRoot,
    [string] $EmpresasTask = "GB-Sync-Empresas",
    [string] $AlumnosTask  = "GB-Sync-Alumnos"
)

$ErrorActionPreference = "Stop"

function Write-Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "  [!] $m"  -ForegroundColor Yellow }

# Verificar consola elevada
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Ejecutar en PowerShell COMO ADMINISTRADOR." }

$empresasScript = Join-Path $ScriptDir "Sync-Empresas.ps1"
$alumnosScript  = Join-Path $ScriptDir "Sync-Alumnos.ps1"
if (-not (Test-Path $empresasScript)) { throw "No se encuentra $empresasScript" }
if (-not (Test-Path $alumnosScript))  { throw "No se encuentra $alumnosScript" }

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# --- Tarea Empresas: diaria 02:00 ---
if (Get-ScheduledTask -TaskName $EmpresasTask -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $EmpresasTask -Confirm:$false
    Write-Warn "Tarea '$EmpresasTask' existente eliminada; se vuelve a crear."
}
$accionEmp  = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$empresasScript`""
$triggerEmp = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName $EmpresasTask -Action $accionEmp -Trigger $triggerEmp `
    -Principal $principal -Description "Sincronización diaria del catálogo de Empresas desde el CRM (02:00)." | Out-Null
Write-Ok "Tarea '$EmpresasTask' registrada (diaria 02:00)."

# --- Tarea Alumnos: cada 5 horas ---
if (Get-ScheduledTask -TaskName $AlumnosTask -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $AlumnosTask -Confirm:$false
    Write-Warn "Tarea '$AlumnosTask' existente eliminada; se vuelve a crear."
}
$accionAlu  = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$alumnosScript`""
$triggerAlu = New-ScheduledTaskTrigger -Once -At 3:00AM -RepetitionInterval (New-TimeSpan -Hours 5)
Register-ScheduledTask -TaskName $AlumnosTask -Action $accionAlu -Trigger $triggerAlu `
    -Principal $principal -Description "Refresco de alumnos existentes desde el CRM cada 5 horas (por DNI/código)." | Out-Null
Write-Ok "Tarea '$AlumnosTask' registrada (cada 5 horas desde 03:00)."

Write-Host "`nTareas registradas. Probar manualmente con:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName '$EmpresasTask'" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName '$AlumnosTask'" -ForegroundColor Cyan
Write-Host "  Get-Content 'C:\deploy\logs\scheduled-tasks\sync-empresas_$(Get-Date -Format yyyyMMdd).log'" -ForegroundColor Cyan
