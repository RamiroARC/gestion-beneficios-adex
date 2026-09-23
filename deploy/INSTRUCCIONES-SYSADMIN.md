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
| Servidor SQL | `10.31.1.220` |
| Base de datos | `BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS` |
| Ambiente | `PreProduction` |
| Autenticación SQL | Usuario/contraseña SQL |

---

## Procedimiento

### 1. Revisar en modo simulación (recomendado)

En PowerShell **como Administrador**, en la carpeta del paquete:

```powershell
.\Deploy-PreProduction.ps1 `
    -PublishSource ".\publish" `
    -FrontendSource ".\frontend" `
    -ConnectionString "Server=10.31.1.220;Database=BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS;User Id=<usuario>;Password=<clave>;TrustServerCertificate=True;Encrypt=True" `
    -JwtKey "<clave-jwt-segura>" `
    -CertificateThumbprint "<thumbprint-del-certificado>" `
    -WhatIf
```

`-WhatIf` muestra todas las acciones **sin aplicar cambios**. Revisar que sean correctas.

### 2. Ejecución real

Quitar `-WhatIf` y ejecutar el mismo comando. El script:

1. Valida prerrequisitos (admin, IIS, Hosting Bundle).
2. Copia `publish\` al sitio (`C:\inetpub\sites\gestion-beneficios`) y `frontend\` a `wwwroot`.
3. Crea el Application Pool `GestionBeneficiosPool` (No Managed Code, Integrated).
4. Crea el sitio `GestionBeneficios` con binding HTTPS.
5. Define las variables de entorno (ambiente + secretos) en el Application Pool.
6. Otorga permisos de escritura sobre `logs` a la identidad del App Pool.
7. Arranca el sitio y verifica el health endpoint.

### 3. Verificar

```powershell
Invoke-WebRequest -Uri "https://localhost/api/health" -UseBasicParsing -SkipCertificateCheck
```

Debe responder **HTTP 200**. La base de datos se crea automáticamente al primer arranque
(la API ejecuta las migraciones EF Core sobre SQL Server).

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

- **SPA fallback**: para que las rutas del router de Angular no devuelvan 404 al refrescar,
  configurar **URL Rewrite** en IIS de modo que las rutas no encontradas caigan a `index.html`.
  (Requiere el módulo URL Rewrite de IIS.)

- **Sincronización CRM al arranque**: si el CRM real no está disponible en el primer arranque,
  la aplicación **arranca igual** (queda un warning en los logs). La sincronización puede
  reintentarse luego con `POST /api/v1/empresas/sync`.

- **Diagnóstico**: si el sitio no responde, activar temporalmente en `web.config` del sitio
  `stdoutLogEnabled="true"` y revisar la carpeta `logs\`. Recordar desactivarlo después.

- **CORS**: si el frontend se sirve desde el mismo sitio/host que la API (recomendado), no se
  requiere configuración adicional de CORS. Si se sirve desde otro host, agregar ese origen a
  `Cors:Origins` en `appsettings.PreProduction.json`. No usar `AllowAnyOrigin`.
