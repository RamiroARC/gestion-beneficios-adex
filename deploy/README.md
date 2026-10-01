# Despliegue a PreProducción — Script de IIS

Automatiza el despliegue y las actualizaciones del sistema en un servidor Windows con IIS.

> Los scripts de servidor se ejecutan **EN EL SERVIDOR**, no en la máquina de desarrollo,
> y requieren PowerShell **como Administrador**.

> **Entorno de este servidor (10.31.1.222)**: cada app se publica en **HTTP con un puerto
> dedicado** (no HTTPS por sitio); el TLS lo resuelve el proxy de borde institucional. Esta app
> usa el **puerto 9020**. Por eso el despliegue se hace con `-UseHttp -HttpPort 9020` y **sin**
> certificado. El modo HTTPS (443 + thumbprint) que se describe abajo queda disponible para
> servidores que sí terminen TLS en IIS.

## Scripts incluidos

| Script | Dónde se ejecuta | Admin | Cuándo |
|--------|------------------|:-----:|--------|
| `Package-Deploy.ps1` | Máquina de desarrollo | ❌ | Cada vez que quieras generar un paquete nuevo |
| `Check-Prerequisites.ps1` | Servidor | ✅ | Antes de desplegar (solo lectura: valida el servidor) |
| `Deploy-PreProduction.ps1` | Servidor | ✅ | **Primer despliegue** (configura IIS completo) |
| `Update-PreProduction.ps1` | Servidor | ✅ | **Actualizaciones** (reemplaza artefactos, no toca IIS) |

## Ciclo de trabajo tras hacer cambios de código

```
1. Cambias código  ->  commit + push a development
2. En tu PC:  .\deploy\Package-Deploy.ps1   (genera deploy-package/)
3. Copias deploy-package/ al servidor (escritorio remoto)
4. El admin ejecuta:
     - Primera vez  -> Deploy-PreProduction.ps1
     - Siguientes   -> Update-PreProduction.ps1
```

> Si un cambio modifica el **modelo de datos**, genera antes una nueva migración EF Core y
> regenera `database/preprod-schema.sql` (ver `database/README.md`). La API aplica la migración
> automáticamente al arrancar.

## Qué hace `Deploy-PreProduction.ps1` (primer despliegue)

1. Valida prerrequisitos (Administrador, módulo IIS, ASP.NET Core Hosting Bundle).
2. Copia el backend publicado y el frontend Angular compilado al sitio.
3. Crea/configura el Application Pool (**No Managed Code**, Integrated).
4. Crea/configura el sitio IIS con binding HTTPS (si se pasa el thumbprint del certificado).
5. Define las variables de entorno del ambiente, **incluidos los secretos** (que se pasan como
   parámetros, nunca se versionan).
6. Otorga permisos de escritura sobre la carpeta de logs a la identidad del App Pool.
7. Arranca el sitio y verifica el health endpoint.

## Preparación (en la máquina de build)

Generar los artefactos y copiarlos al servidor (por ejemplo a `C:\deploy`):

```powershell
# Frontend
cd web
npm ci
npm run build:preproduction
# copiar web/dist/gestion-beneficios-web/browser  ->  C:\deploy\frontend  (en el servidor)

# Backend
dotnet publish src\GestionBeneficios.Api -c Release -o publish
# copiar publish  ->  C:\deploy\publish  (en el servidor)

# copiar tambien deploy\Deploy-PreProduction.ps1 al servidor
```

## Ejecución (en el servidor, PowerShell como Administrador)

**Simulación primero** (recomendado — muestra qué hará sin aplicar cambios):

```powershell
.\Deploy-PreProduction.ps1 `
    -PublishSource "C:\deploy\publish" `
    -FrontendSource "C:\deploy\frontend" `
    -ConnectionString "Server=10.31.1.220;Database=BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS;User Id=<usuario>;Password=<clave>;TrustServerCertificate=True;Encrypt=True" `
    -JwtKey "<clave-jwt-segura>" `
    -CertificateThumbprint "<thumbprint-del-certificado>" `
    -WhatIf
```

**Ejecución real** (quitar `-WhatIf`):

```powershell
.\Deploy-PreProduction.ps1 `
    -PublishSource "C:\deploy\publish" `
    -FrontendSource "C:\deploy\frontend" `
    -ConnectionString "Server=10.31.1.220;Database=BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS;User Id=<usuario>;Password=<clave>;TrustServerCertificate=True;Encrypt=True" `
    -JwtKey "<clave-jwt-segura>" `
    -CertificateThumbprint "<thumbprint-del-certificado>"
```

## Parámetros

| Parámetro | Obligatorio | Descripción |
|-----------|:-----------:|-------------|
| `ConnectionString` | Sí | Cadena de conexión a SQL Server 2022. **Secreto.** |
| `JwtKey` | Sí | Clave de firma JWT para PreProduction. **Secreto.** |
| `PublishSource` | No | Ruta del backend publicado. Default `.\publish` |
| `FrontendSource` | No | Ruta del frontend compilado. Default `.\frontend` |
| `SitePath` | No | Carpeta destino del sitio. Default `C:\inetpub\sites\gestion-beneficios` |
| `SiteName` | No | Nombre del sitio IIS. Default `GestionBeneficios` |
| `AppPoolName` | No | Nombre del Application Pool. Default `GestionBeneficiosPool` |
| `UseHttp` | No | Crea el sitio en **HTTP** con puerto dedicado y omite todo lo de HTTPS/certificado. |
| `HttpPort` | No | Puerto HTTP cuando se usa `-UseHttp`. Default `9020` |
| `HttpsPort` | No | Puerto HTTPS (solo sin `-UseHttp`). Default `443` |
| `HostHeader` | No | Host header del binding. Default vacío |
| `CertificateThumbprint` | No | Thumbprint del certificado TLS ya instalado. Sin él no se configura HTTPS. |
| `AspNetCoreEnvironment` | No | Default `PreProduction` |
| `HealthUrl` | No | URL para verificar salud. Si se omite: `http://localhost:<HttpPort>/api/health` con `-UseHttp`, o `https://localhost/api/health` en modo HTTPS. |

## Qué hace `Update-PreProduction.ps1` (actualizaciones)

Para publicar una nueva versión cuando el sitio **ya existe**. No recrea IIS ni toca los
secretos; solo reemplaza los artefactos.

1. Detiene el sitio y el Application Pool.
2. **Respalda** la versión actual en `C:\deploy\backups\<timestamp>` (para revertir).
3. Reemplaza backend y frontend con los nuevos artefactos.
4. Reinicia el sitio y verifica el health endpoint.

```powershell
# En el servidor, como Administrador
.\Update-PreProduction.ps1 -PublishSource ".\publish" -FrontendSource ".\frontend" -WhatIf   # simular
.\Update-PreProduction.ps1 -PublishSource ".\publish" -FrontendSource ".\frontend"           # aplicar
```

**Revertir**: copiar el respaldo más reciente de `C:\deploy\backups\` sobre la carpeta del
sitio y reiniciar el Application Pool.

## Seguridad

- Los secretos (`ConnectionString`, `JwtKey`) se pasan como parámetros en el momento de ejecutar.
  **No se escriben en el repositorio ni en archivos** por el script; quedan solo en la
  configuración de IIS del servidor.
- Evitar dejar el comando con los secretos en el historial de PowerShell del servidor
  (considerar `Clear-History` o usar `Read-Host -AsSecureString` para capturarlos).

## Después del despliegue

- Verificar `https://<servidor>/api/health`.
- Si la sincronización inicial del CRM falló (CRM no disponible), la API arranca igual
  (por el fix de tolerancia). Reintentar luego con `POST /api/v1/empresas/sync`.
- Para diagnóstico, activar temporalmente `stdoutLogEnabled="true"` en `web.config` del sitio
  y revisar la carpeta `logs`.
- **SPA fallback**: ya lo resuelve la propia API (`UseStaticFiles` + `MapFallback` a `index.html`),
  por lo que **no se requiere** el módulo URL Rewrite de IIS. El frontend debe quedar en la
  carpeta `wwwroot` del sitio (los scripts lo copian ahí automáticamente). Las rutas `/api/...`
  inexistentes siguen devolviendo 404.
