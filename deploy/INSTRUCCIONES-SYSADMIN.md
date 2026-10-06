# Instrucciones de despliegue — Administrador del servidor

Guía para desplegar **Sistema de Gestión de Beneficios ADEX** en el servidor de
**PreProducción** (Windows Server + IIS + SQL Server 2022).

Este documento está dirigido a quien tenga **privilegios de administrador** en el servidor.

---

## Qué recibe

Una carpeta (por ejemplo `C:\deploy`) con:

| Elemento | Descripción |
|----------|-------------|
| `publish\` | Backend ASP.NET Core 10 ya compilado (incluye `web.config` para IIS) |
| `frontend\` | Aplicación Angular compilada (archivos estáticos) |
| `Deploy-PreProduction.ps1` | Script que automatiza la configuración de IIS |
| `INSTRUCCIONES-SYSADMIN.md` | Este documento |

Por separado y por un canal seguro (no incluidos en el paquete): la **connection string**
de SQL Server y la **clave JWT**.

---

## Prerrequisitos en el servidor

1. **Rol Web Server (IIS)** instalado.
2. **ASP.NET Core Hosting Bundle** para .NET 10 instalado. Verificar con:
   ```powershell
   Get-WebGlobalModule | Where-Object { $_.Name -like "AspNetCoreModuleV2" }
   ```
   Si no aparece, descargar e instalar el Hosting Bundle .NET 10 desde el sitio oficial de
   Microsoft, luego `iisreset`.
3. Certificado TLS instalado en el servidor (para el binding HTTPS). Anotar su **thumbprint**.
4. La base de datos `BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS` existe en `10.31.1.220` y el
   usuario SQL del connection string tiene permiso para **crear tablas** en ella.

---

## Datos del ambiente

| Elemento | Valor |
|----------|-------|
| Servidor web (IIS) | `10.31.1.222` |
| Puerto HTTP de la app | `9020` |
| Servidor SQL | `10.31.1.220` |
| Base de datos | `BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS` |
| Ambiente | `PreProduction` |
| Autenticación SQL | Usuario/contraseña SQL |

> **Nota de este servidor**: aquí cada aplicación se publica en **HTTP con un puerto dedicado**
> (no HTTPS por sitio). El TLS lo resuelve el proxy/balanceador de borde de la institución. Por
> eso el despliegue se hace con `-UseHttp -HttpPort 9020` y **no** requiere certificado en IIS.
> La URL interna de la app será `http://10.31.1.222:9020/`.

---

## Procedimiento

### 0. Verificar prerrequisitos (solo lectura, recomendado)

Antes de desplegar, correr el verificador. **No modifica nada**: solo comprueba admin, IIS,
Hosting Bundle, certificado, conectividad al SQL y los artefactos del paquete, e indica si
corresponde un primer despliegue o una actualización.

```powershell
.\Check-Prerequisites.ps1 `
    -PublishSource ".\publish" `
    -FrontendSource ".\frontend" `
    -SqlHost "10.31.1.220"
```

Resolver cualquier `[FAIL]` antes de continuar. Las `[!]` son advertencias. En este servidor
NO se usa certificado (modo HTTP), así que la advertencia de thumbprint es esperada.

### 1. Revisar en modo simulación (recomendado)

En PowerShell **como Administrador**, en la carpeta del paquete:

```powershell
.\Deploy-PreProduction.ps1 `
    -PublishSource ".\publish" `
    -FrontendSource ".\frontend" `
    -UseHttp -HttpPort 9020 `
    -ConnectionString "Server=10.31.1.220;Database=BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS;User Id=<usuario>;Password=<clave>;TrustServerCertificate=True;Encrypt=True" `
    -JwtKey "<clave-jwt-segura>" `
    -WhatIf
```

`-WhatIf` muestra todas las acciones **sin aplicar cambios**. Revisar que sean correctas.

### 2. Ejecución real

Quitar `-WhatIf` y ejecutar el mismo comando. El script:

1. Valida prerrequisitos (admin, IIS, Hosting Bundle).
2. Copia `publish\` al sitio (`C:\inetpub\sites\gestion-beneficios`) y `frontend\` a `wwwroot`.
3. Crea el Application Pool `GestionBeneficiosPool` (No Managed Code, Integrated).
4. Crea el sitio `GestionBeneficios` con binding **HTTP en el puerto 9020** (sin certificado).
5. Define las variables de entorno (ambiente + secretos) en el Application Pool.
6. Otorga permisos de escritura sobre `logs` a la identidad del App Pool.
7. Arranca el sitio y verifica el health endpoint.

### 3. Verificar

```powershell
Invoke-WebRequest -Uri "http://localhost:9020/api/health" -UseBasicParsing
```

Debe responder **HTTP 200**. La base de datos se crea automáticamente al primer arranque
(la API ejecuta las migraciones EF Core sobre SQL Server). El SPA responde en
`http://10.31.1.222:9020/`.

---

## Actualizaciones posteriores (nuevas versiones de código)

Para publicar una nueva versión **cuando el sitio ya existe**, NO se usa
`Deploy-PreProduction.ps1` (ese es solo para el primer despliegue). Se usa
`Update-PreProduction.ps1`, que reemplaza los artefactos sin tocar la configuración de IIS ni
los secretos ya guardados.

```powershell
# Con el nuevo paquete copiado al servidor, en PowerShell como Administrador:
.\Update-PreProduction.ps1 -PublishSource ".\publish" -FrontendSource ".\frontend" -WhatIf   # simular
.\Update-PreProduction.ps1 -PublishSource ".\publish" -FrontendSource ".\frontend"           # aplicar
```

El script de actualización:

1. Detiene el sitio y el Application Pool.
2. **Respalda** la versión actual en `C:\deploy\backups\` (para poder revertir).
3. Reemplaza el backend y el frontend con los nuevos artefactos (preserva `wwwroot`/`logs` según corresponda).
4. Reinicia el sitio y verifica el health endpoint.

**Cambios de esquema**: si la nueva versión incluye una migración EF Core nueva, la API la
aplica automáticamente al arrancar (`MigrateAsync`). No requiere acción manual. Si se prefiere
aplicarla antes con SSMS, regenerar y ejecutar `database\preprod-schema.sql` (es idempotente).

**Revertir**: si una actualización falla, restaurar copiando el respaldo más reciente de
`C:\deploy\backups\` sobre la carpeta del sitio y reiniciar.

---

## Base de datos: creación del esquema

El esquema se crea de forma **automática** al primer arranque de la API (`MigrateAsync`).

Alternativa (si se prefiere aplicarlo manualmente antes): ejecutar el script idempotente
`database\preprod-schema.sql` del repositorio con SSMS sobre la base
`BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS`. Se puede correr varias veces sin error.

---

## Notas importantes

- **Secretos**: la connection string y la JWT key se pasan solo como parámetros al ejecutar.
  El script las escribe únicamente en la configuración de IIS del servidor. No están en el
  repositorio ni en el paquete. Considerar `Clear-History` tras ejecutar para no dejar los
  secretos en el historial de PowerShell.

- **SPA fallback**: lo gestiona la propia API (sirve los archivos de `wwwroot` y hace fallback
  a `index.html` para las rutas del router de Angular). **No requiere** el módulo URL Rewrite de
  IIS. Solo asegurar que el frontend quede en la carpeta `wwwroot` del sitio (los scripts de
  despliegue lo copian ahí automáticamente). Las rutas `/api/...` inexistentes devuelven 404.

- **Sincronización CRM al arranque**: si el CRM real no está disponible en el primer arranque,
  la aplicación **arranca igual** (queda un warning en los logs). La sincronización puede
  reintentarse luego con `POST /api/v1/empresas/sync`.

- **Diagnóstico**: si el sitio no responde, activar temporalmente en `web.config` del sitio
  `stdoutLogEnabled="true"` y revisar la carpeta `logs\`. Recordar desactivarlo después.

- **CORS**: si el frontend se sirve desde el mismo sitio/host que la API (recomendado), no se
  requiere configuración adicional de CORS. Si se sirve desde otro host, agregar ese origen a
  `Cors:Origins` en `appsettings.PreProduction.json`. No usar `AllowAnyOrigin`.

---

## Tareas programadas de sincronización del CRM

La carpeta `scheduled-tasks\` del paquete trae scripts para automatizar la sincronización del
CRM mediante el **Programador de tareas de Windows**. **No modifican la aplicación**: solo
consumen endpoints HTTP ya existentes.

| Script | Qué hace | Frecuencia |
|--------|----------|-----------|
| `Sync-Empresas.ps1` | Sincroniza el catálogo completo de Empresas (`POST /api/v1/empresas/sync`) | Diaria 02:00 |
| `Sync-Alumnos.ps1` | Refresca los alumnos **ya registrados** por DNI/código (`POST /api/v1/alumnos/sync/{criterio}`) | Cada 5 horas |
| `Register-ScheduledTasks.ps1` | Registra ambas tareas en el Programador de tareas | — |

### Instalación

1. Copiar la carpeta `scheduled-tasks\` del paquete al servidor (por ejemplo a
   `C:\deploy\scheduled-tasks\`).
2. En PowerShell **como Administrador**, ejecutar:
   ```powershell
   C:\deploy\scheduled-tasks\Register-ScheduledTasks.ps1
   ```
   Crea las tareas `GB-Sync-Empresas` (diaria 02:00) y `GB-Sync-Alumnos` (cada 5 h), que corren
   como `SYSTEM`.
3. Probar manualmente y revisar el log:
   ```powershell
   Start-ScheduledTask -TaskName "GB-Sync-Empresas"
   Get-Content "C:\deploy\logs\scheduled-tasks\sync-empresas_$(Get-Date -Format yyyyMMdd).log"
   ```

### Notas

- Ambas tareas requieren que la API esté arriba (`http://localhost:9020`) y que
  `CrmEmpresas__CodUser` esté configurado en el App Pool de IIS. Sin el `CodUser`, el CRM
  rechaza la autenticación y el resultado queda registrado como error en el log de la tarea.
- **Alumnos (Opción C)**: el CRM de Alumnos no expone listado masivo (solo búsqueda por DNI o
  código), por lo que la tarea **refresca los alumnos existentes**; no descubre alumnos nuevos.
- Los logs quedan en `C:\deploy\logs\scheduled-tasks\` con un archivo por día.
- Si cambian los puertos o la URL base, pasar `-BaseUrl` a los scripts o editar los parámetros
  por defecto.
