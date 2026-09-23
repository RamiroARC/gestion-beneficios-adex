# Despliegue a PreProducción — Script de IIS

Este script automatiza el despliegue del sistema en un servidor Windows con IIS.

> **Se ejecuta EN EL SERVIDOR de preproducción**, no en la máquina de desarrollo.
> Requiere PowerShell **como Administrador** y el rol IIS instalado.

## Qué hace `Deploy-PreProduction.ps1`

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
| `HttpsPort` | No | Puerto HTTPS. Default `443` |
| `HostHeader` | No | Host header del binding. Default vacío |
| `CertificateThumbprint` | No | Thumbprint del certificado TLS ya instalado. Sin él no se configura HTTPS. |
| `AspNetCoreEnvironment` | No | Default `PreProduction` |
| `HealthUrl` | No | URL para verificar salud. Default `https://localhost/api/health` |

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
- Configurar el **SPA fallback** (URL Rewrite) para que las rutas de Angular caigan a `index.html`.
