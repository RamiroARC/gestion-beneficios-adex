using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GestionBeneficios.Infrastructure.Persistence;

public static class EmpresaSchemaPatcher
{
    private static readonly (string Column, string SqliteType, string SqlServerType)[] Columns =
    [
        ("Correo", "TEXT", "NVARCHAR(250) NULL"),
        ("Telefono", "TEXT", "NVARCHAR(50) NULL"),
        ("PaginaWeb", "TEXT", "NVARCHAR(250) NULL"),
        ("EjecutivoComercial", "TEXT", "NVARCHAR(200) NULL"),
        ("Promotor", "TEXT", "NVARCHAR(200) NULL"),
        ("Gerencia", "TEXT", "NVARCHAR(200) NULL"),
        ("Comite", "TEXT", "NVARCHAR(200) NULL"),
        ("EstadoCrm", "TEXT", "NVARCHAR(100) NULL"),
        ("FechaAltaCrm", "TEXT", "NVARCHAR(50) NULL"),
        ("CrmCreatedOn", "TEXT", "DATETIME2 NULL")
    ];

    public static async Task ApplyAsync(BeneficiosDbContext db, ILogger logger, CancellationToken ct = default)
    {
        var provider = db.Database.ProviderName ?? string.Empty;
        var isSqlite = provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase);

        foreach (var (column, sqliteType, sqlServerType) in Columns)
        {
            try
            {
                var sql = isSqlite
                    ? $"ALTER TABLE EmpresaAsociada ADD COLUMN {column} {sqliteType} NULL"
                    : $"IF COL_LENGTH('EmpresaAsociada', '{column}') IS NULL ALTER TABLE EmpresaAsociada ADD {column} {sqlServerType};";

                await db.Database.ExecuteSqlRawAsync(sql, ct);
            }
            catch (Exception ex) when (isSqlite && ex.Message.Contains("duplicate column", StringComparison.OrdinalIgnoreCase))
            {
                // Column already exists in SQLite.
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "No se pudo aplicar parche de columna {Column} en EmpresaAsociada.", column);
            }
        }
    }
}
