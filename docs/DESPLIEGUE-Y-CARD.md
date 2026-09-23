## Despliegue y Card (Fases 8–10)

### Despliegue sugerido

| Componente | Destino |
|------------|---------|
| API .NET 10 | Azure App Service / IIS |
| SQL Server 2022 / Azure SQL | Connection string en Key Vault |
| Angular SPA | Static Web Apps / App Service / CDN |
| Jobs | Hosted Service en la API (ya incluido) o Azure Functions Timer |

### Checklist pre-producción

- [ ] Reemplazar Dev JWT por Login Centros Académico
- [ ] Configurar CRM de Empresas en producción (`CodUser`, `UseMock: false`, `BaseUrl`, `PageSize`) — ver [CRM-EMPRESAS.md §5](CRM-EMPRESAS.md#5-configuración)
- [ ] Configurar CRM de Alumnos (`CrmAlumnos:UseMock: false`; auth vía `CrmEmpresas:CodUser`) — ver [CRM-ALUMNOS.md §5](CRM-ALUMNOS.md#5-configuración)
- [ ] Configurar SMTP / Graph para `IEmailSender`
- [ ] Provider SQL Server + migraciones formales
- [ ] CORS solo orígenes institucionales
- [ ] Rate limiting en canjes/cargas si aplica
- [ ] Retención de auditoría (política pendiente)

### Card institucional

La “Card” de Login Centros **no se inventa** aquí. Cuando exista el contrato (claims, client id, redirect URIs), registrar la aplicación y mapear roles:

- `Administrador`
- `Operador`
- `Consulta`
- `GestionBeneficios`

Hasta entonces, el SPA usa `POST /api/v1/auth/dev-token`.

---

## Arquitectura multi-ambiente

```
DEVELOPMENT (local)                    PREPRODUCTION (Windows Server)
──────────────────                     ──────────────────────────────
Angular 22 (ng serve :4200)            IIS
        │                                ├── Angular compilado (static files)
        ▼  environment.ts                │       build:preproduction
.NET 10 (dotnet run :5280)              └── ASP.NET Core 10 (Hosting Bundle)
        │  Development                           │  ASPNETCORE_ENVIRONMENT=PreProduction
        ▼                                        ▼
SQLite (gestion-beneficios.db)          SQL Server 2022
```

La selección de proveedor de base de datos y de URL de API es **automática por ambiente**; no se modifica código para desplegar.

### Selección de configuración

| Ambiente | Variable | appsettings efectivo | Provider BD | Angular env |
|----------|----------|----------------------|-------------|-------------|
| Development | `ASPNETCORE_ENVIRONMENT=Development` | `appsettings.json` + `appsettings.Development.json` | SQLite | `environment.ts` |
| PreProduction | `ASPNETCORE_ENVIRONMENT=PreProduction` | `appsettings.json` + `appsettings.PreProduction.json` | SQL Server | `environment.preproduction.ts` |

### Secretos (nunca en el repositorio)

En el servidor, definir como variables de entorno del Application Pool:

```text
ASPNETCORE_ENVIRONMENT        = PreProduction
ConnectionStrings__Beneficios = Server=SERVIDOR-SQL;Database=GestionBeneficios;User Id=usuario;Password=***;TrustServerCertificate=True;Encrypt=True
Authentication__DevJwt__Key   = <clave-segura>
```

`appsettings.PreProduction.json` versionado contiene **solo placeholders y estructura**, sin valores reales.

---

## Preparación del build

### Frontend (Angular compilado)

```powershell
cd web
npm ci
npm run build:preproduction
# Salida: web/dist/gestion-beneficios-web/browser
```

### Backend (publish)

```powershell
dotnet publish src\GestionBeneficios.Api -c Release -o publish
# Genera publish/ con el binario, appsettings*.json y web.config para IIS
```

---

## Configuración de IIS (Windows Server) — referencia

> Solo documentación. No modificar el servidor todavía.

### Requisitos en el servidor

- **ASP.NET Core Hosting Bundle** para .NET 10 (instala el runtime + módulo ANCM `AspNetCoreModuleV2`).
- IIS con los roles: *Web Server (IIS)*, *Application Development* → *WebSocket* (opcional).

### Application Pool

- **.NET CLR version**: `No Managed Code` (la app corre out-of-process/in-process vía ANCM, no usa el CLR del pool).
- **Managed pipeline mode**: Integrated.
- **Identity**: cuenta de servicio con permisos mínimos; se le otorgan las variables de entorno del ambiente.

### Sitio y binding

- **Physical path**: carpeta donde se copió el contenido de `publish/`.
- **Binding HTTPS**: puerto 443 con certificado válido. Redirigir HTTP→HTTPS.
- **Angular**: los archivos de `web/dist/gestion-beneficios-web/browser` se sirven como static files desde el mismo sitio (o subcarpeta), de modo que las rutas relativas `/api/v1` resuelven contra la misma API.

### web.config

- Generado automáticamente por `dotnet publish` (incluye el handler ANCM y `hostingModel="inprocess"`).
- Habilitar logging temporal para diagnóstico: `stdoutLogEnabled="true"` y `stdoutLogFile=".\logs\stdout"`.

### Static files y SPA fallback

- Habilitar que rutas del router de Angular caigan a `index.html` (URL Rewrite o configuración del sitio) para navegación de la SPA.

### Permisos de carpetas

- La identidad del App Pool necesita **lectura/ejecución** sobre la carpeta de publicación y **escritura** sobre la carpeta de `logs`.

### CORS

- En el mismo host (Angular + API bajo el mismo binding), CORS puede no ser necesario. Si el frontend se sirve desde un host distinto, agregar ese origen a `Cors:Origins` del ambiente PreProduction. **No usar `AllowAnyOrigin`.**

### Variables de entorno

- Definir a nivel de Application Pool (o `web.config` `environmentVariables`, evitando incluir secretos versionados): `ASPNETCORE_ENVIRONMENT`, `ConnectionStrings__Beneficios`, `Authentication__DevJwt__Key`.

---

## Base de datos en PreProducción

El esquema se administra con **migraciones EF Core** (dialecto SQL Server). Hay dos formas
equivalentes de aplicarlo a `BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS`:

1. **Script SQL idempotente (recomendado para el DBA)**: ejecutar
   [`database/preprod-schema.sql`](../database/preprod-schema.sql) con SSMS. Se puede correr
   varias veces sin error. Revisable antes de aplicar.
2. **Automático al arrancar**: la API ejecuta `MigrateAsync()` en `SeedAsync` cuando el proveedor
   es SQL Server, creando/actualizando el esquema al iniciar.

Consideraciones:

- La cuenta SQL necesita permiso para **crear tablas** en la base (o aplicar el script previamente).
- La estrategia es **por proveedor**: SQL Server usa migraciones (`MigrateAsync`), SQLite en
  desarrollo usa `EnsureCreatedAsync`. Las migraciones son exclusivas de SQL Server.
- Puntos a verificar en SQL Server (difieren de SQLite): **precisión decimal (18,2)** en cálculos
  de puntos/sueldo y **case sensitivity / collation** en búsquedas de texto.
- Para añadir cambios de esquema futuros: crear nueva migración y regenerar el script idempotente
  (ver [`database/README.md`](../database/README.md)).
