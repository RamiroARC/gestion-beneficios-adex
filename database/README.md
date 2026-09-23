# Scripts de base de datos — PreProducción (SQL Server 2022)

Esta carpeta contiene los artefactos de esquema para desplegar la base de datos en el
ambiente de **PreProducción**.

## `preprod-schema.sql`

Script **idempotente** generado por EF Core a partir de la migración `InitialCreate`.

- Se puede ejecutar **múltiples veces sin error**: cada objeto se crea solo si no existe
  (verifica la tabla `__EFMigrationsHistory` antes de aplicar la migración).
- Crea las 14 tablas del sistema con sus índices únicos y compuestos.
- Usa tipos nativos de SQL Server: `nvarchar`, `datetime2`, `decimal(18,2)`, `bit`, `bigint`, `date`, `IDENTITY`.

### Cómo aplicarlo (opción recomendada para el DBA)

1. Conectarse con SSMS al servidor `10.31.1.220`.
2. Seleccionar la base de datos `BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS`.
3. Abrir y **revisar** `preprod-schema.sql`.
4. Ejecutar el script. Al terminar, la BD tendrá el esquema completo y la migración
   quedará registrada en `__EFMigrationsHistory`.

La cuenta SQL usada necesita permiso para **crear tablas** en la base de datos.

### Alternativa: aplicar migración desde la CLI

Solo si se prefiere aplicar directamente con la herramienta (requiere conectividad y
la cadena de conexión como variable de entorno, nunca en el repo):

```powershell
$env:ASPNETCORE_ENVIRONMENT = "PreProduction"
$env:ConnectionStrings__Beneficios = "Server=10.31.1.220;Database=BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS;User Id=<usuario>;Password=<clave>;TrustServerCertificate=True;Encrypt=True"
dotnet ef database update --project src\GestionBeneficios.Infrastructure --startup-project src\GestionBeneficios.Api
```

## Regenerar el script

Si el modelo cambia y se añade una nueva migración, regenerar el script idempotente:

```powershell
dotnet ef migrations script --idempotent `
  --project src\GestionBeneficios.Infrastructure `
  --startup-project src\GestionBeneficios.Api `
  --output database\preprod-schema.sql
```

## Estrategia de esquema por proveedor

La aplicación decide cómo crear el esquema según el proveedor activo (en `SeedAsync`):

| Ambiente | Proveedor | Mecanismo | Migraciones |
|----------|-----------|-----------|-------------|
| Development | SQLite (`gestion-beneficios.db`) | `EnsureCreatedAsync()` | No las usa |
| PreProduction | SQL Server 2022 | `MigrateAsync()` (o el script `preprod-schema.sql`) | Sí |

**Por qué así:** una migración EF Core se genera para un proveedor específico. La migración
`InitialCreate` usa dialecto SQL Server (`nvarchar`, `datetime2`, `decimal(18,2)`), por lo que
**no aplica a SQLite**. SQLite crea el esquema directo del modelo con `EnsureCreatedAsync`, que no
requiere migraciones. Así cada motor usa el mecanismo que le corresponde sin interferencias.

> Importante: las migraciones de esta carpeta son **exclusivas de SQL Server**. No ejecutar
> `dotnet ef database update` apuntando a SQLite.

## Notas de compatibilidad SQLite vs SQL Server

Puntos a verificar al operar en SQL Server (difieren de SQLite):
- **Precisión decimal**: SQL Server respeta `decimal(18,2)`; SQLite almacena como REAL. Vigilar
  redondeos en cálculos de puntos/sueldo.
- **Case sensitivity / collation**: SQLite es case-insensitive ASCII por defecto; en SQL Server
  depende del collation de `BD_SISTEMA_GESTION_BENEFICIOS_EMPRESAS`. Afecta búsquedas de texto.
