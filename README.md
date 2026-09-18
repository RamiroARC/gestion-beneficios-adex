# Sistema de Gestión de Beneficios (ADEX)

Greenfield: **Angular 22 + .NET 10 + SQL Server 2022** (desarrollo local usa **SQLite** por defecto).

`reserva-salas` no forma parte de este sistema.

## Estructura

```
gestion-beneficios-adex/
  src/
    GestionBeneficios.Api
    GestionBeneficios.Application
    GestionBeneficios.Domain
    GestionBeneficios.Infrastructure
  tests/
  web/                      # Angular 22 + Material
  docs/
  postman/
```

## Requisitos

- .NET SDK 10
- Node.js ≥ 22.22 (o 24 LTS) para Angular 22
- SQLite (incluido, no requiere instalación) para desarrollo local
- SQL Server 2022 **solo para PreProducción** (no necesario en local)

## Ambientes

La aplicación selecciona su configuración automáticamente según el ambiente en que se ejecuta. No se cambia código para pasar de un ambiente a otro, solo configuración.

| Ambiente | Frontend | Backend | Base de datos | Hosting |
|----------|----------|---------|---------------|---------|
| **Development** (local) | `ng serve` :4200 | `dotnet run` :5280 | **SQLite** (`gestion-beneficios.db`) | Kiro / PC local |
| **PreProduction** (servidor) | Angular compilado | ASP.NET Core 10 | **SQL Server 2022** | Windows Server + IIS |

### Cómo se selecciona la base de datos

El backend lee `Database:Provider` de la configuración del ambiente activo:

- `ASPNETCORE_ENVIRONMENT=Development` → `appsettings.json` (Provider `Sqlite`) → **SQLite**
- `ASPNETCORE_ENVIRONMENT=PreProduction` → `appsettings.PreProduction.json` (Provider `SqlServer`) → **SQL Server**

La selección la hace `AddInfrastructure` (`UseSqlite` / `UseSqlServer`) sin tocar código.

### Cómo Angular selecciona la URL de la API

Vía `fileReplacements` en `angular.json`:

- `ng serve` (development) → `environment.ts` → `http://localhost:5280/api/v1`
- `npm run build` (production) → `environment.prod.ts` → `/api/v1` (rutas relativas)
- `npm run build:preproduction` → `environment.preproduction.ts` → `/api/v1` (rutas relativas para IIS)

## Fase 0 (stubs)

Ver [docs/FASE0-DECISIONES-STUB.md](docs/FASE0-DECISIONES-STUB.md):

- Auth: JWT de desarrollo (`POST /api/v1/auth/dev-token`) hasta Login Centros
- CRM: `MockCrmEmpresasClient` / `CrmEmpresasHttpClient` (empresas); `MockCrmAlumnosClient` / `CrmAlumnosHttpClient` (alumnos)
- Puntos: titular = empresa; meses enteros; canje inmediato

## Desarrollo local (Development → SQLite)

```powershell
# Desde la raíz del repositorio
dotnet restore
dotnet build
dotnet test
dotnet run --project src\GestionBeneficios.Api
```

API: http://localhost:5280  
OpenAPI: http://localhost:5280/openapi/v1.json  
Health: http://localhost:5280/api/health

- La base de datos SQLite (`gestion-beneficios.db`) se crea automáticamente al iniciar la API (`EnsureCreatedAsync` + seed).
- No se requiere instalar ni configurar nada adicional.
- El perfil `launchSettings.json` ya fija `ASPNETCORE_ENVIRONMENT=Development`.

### Verificar que la API funciona

```powershell
# Health check
curl http://localhost:5280/api/health
```

### Frontend local

```powershell
cd web
npm install
npm start          # ng serve → http://localhost:4200
```

El proxy (`web/proxy.conf.json`) redirige `/api` a `:5280`, y `environment.ts` apunta a `http://localhost:5280/api/v1`.

## PreProducción (PreProduction → SQL Server 2022)

Ver la guía completa en [docs/DESPLIEGUE-Y-CARD.md](docs/DESPLIEGUE-Y-CARD.md). Resumen:

```powershell
# 1. Compilar frontend para preproducción
cd web
npm run build:preproduction     # genera web/dist/gestion-beneficios-web

# 2. Publicar backend
dotnet publish src\GestionBeneficios.Api -c Release -o publish
```

En el servidor, la configuración sensible se inyecta por **variables de entorno** (nunca en el repo):

```text
ASPNETCORE_ENVIRONMENT = PreProduction
ConnectionStrings__Beneficios = Server=...;Database=GestionBeneficios;User Id=...;Password=...;TrustServerCertificate=True;Encrypt=True
Authentication__DevJwt__Key   = <clave-segura-de-preproduccion>
```

> `appsettings.SqlServer.json` se conserva como referencia histórica del formato de connection string. El ambiente real es `appsettings.PreProduction.json` (con placeholders) + variables de entorno.

## Frontend

```powershell
cd web
npm install
npm start
```

SPA: http://localhost:4200  
Login stub: usuario libre + rol (`Administrador` / `Operador` / `Consulta` / `GestionBeneficios`).

Proxy opcional: `web/proxy.conf.json` → API en `:5280`.

## Postman

Importar [postman/GestionBeneficios.postman_collection.json](postman/GestionBeneficios.postman_collection.json).

1. `Auth / Dev Token`
2. Usar `access_token` en Bearer

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Arquitectura: capas, DI, queries, frontend (Markdown + diagramas Mermaid) |
| [docs/MODELO-DATOS.md](docs/MODELO-DATOS.md) | Modelo de datos: ERD, diccionario de tablas, enums, flujo de puntos |
| [docs/ARQUITECTURA-Gestion-Beneficios-ADEX.docx](docs/ARQUITECTURA-Gestion-Beneficios-ADEX.docx) | Misma arquitectura en formato Word |
| [docs/FASE0-DECISIONES-STUB.md](docs/FASE0-DECISIONES-STUB.md) | Stubs auth, CRM, puntos |
| [docs/DESPLIEGUE-Y-CARD.md](docs/DESPLIEGUE-Y-CARD.md) | Despliegue institucional |
| [docs/CARGA-MASIVA-EXCEL.md](docs/CARGA-MASIVA-EXCEL.md) | Formato Excel cargas |
| [docs/CRM-EMPRESAS.md](docs/CRM-EMPRESAS.md) | Integración CRM de Empresas: API ADEX, sync, mapeo, config |
| [docs/CRM-ALUMNOS.md](docs/CRM-ALUMNOS.md) | Integración CRM de Alumnos: sync on-demand por DNI/código |

Regenerar el Word: `npm install docx --no-save && node tmp/generar-arquitectura-docx.mjs`

## Despliegue (borrador institucional)

- API: Azure App Service / IIS + SQL Server / Azure SQL
- Web: static hosting (App Service / CDN) apuntando a API
- Secretos: Key Vault / variables de entorno (nunca en repo)
- Sustituir Dev JWT por Login Centros y mock CRM por cliente real
- Card institucional: pendiente de contrato Login Centros

## Pruebas

- Unitarias: `PuntosCalculator` (1300×3=3900) y reglas relacionadas
- Manual: flujo empresa sync → alumno → contratación → puntos → canje → auditoría
