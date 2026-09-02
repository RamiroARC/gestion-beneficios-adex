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
- SQL Server 2022 (opcional en local; ver abajo)

## Fase 0 (stubs)

Ver [docs/FASE0-DECISIONES-STUB.md](docs/FASE0-DECISIONES-STUB.md):

- Auth: JWT de desarrollo (`POST /api/v1/auth/dev-token`) hasta Login Centros
- CRM: `MockCrmEmpresasClient` (dev) / `CrmEmpresasHttpClient` (prod, API ADEX)
- Puntos: titular = empresa; meses enteros; canje inmediato

## Backend

```powershell
cd C:\Users\liton\Projects\gestion-beneficios-adex
dotnet restore
dotnet build
dotnet test
dotnet run --project src\GestionBeneficios.Api
```

API: http://localhost:5280  
OpenAPI: http://localhost:5280/openapi/v1.json  
Health: http://localhost:5280/api/health

### SQL Server

Copiar/mergear `src/GestionBeneficios.Api/appsettings.SqlServer.json` o variables:

```json
"ConnectionStrings": { "Beneficios": "Server=...;Database=GestionBeneficios;..." },
"Database": { "Provider": "SqlServer" }
```

Por defecto: SQLite `gestion-beneficios.db` en el directorio de ejecución.

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
