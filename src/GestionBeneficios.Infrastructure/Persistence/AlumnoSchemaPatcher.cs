using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GestionBeneficios.Infrastructure.Persistence;

public static class AlumnoSchemaPatcher
{
    private static readonly (string Column, string SqliteType, string SqlServerType)[] Columns =
    [
        ("CrmAlumnoCodigo", "TEXT", "NVARCHAR(50) NULL"),
        ("Dni", "TEXT", "NVARCHAR(20) NULL"),
        ("EmailPersonal", "TEXT", "NVARCHAR(250) NULL"),
        ("Modalidad", "TEXT", "NVARCHAR(100) NULL"),
        ("FechaNacimiento", "TEXT", "DATETIME2 NULL"),
        ("Denominacion", "TEXT", "NVARCHAR(200) NULL"),
        ("UltimaSyncUtc", "TEXT", "DATETIME2 NULL")
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
                    ? $"ALTER TABLE Alumno ADD COLUMN {column} {sqliteType} NULL"
                    : $"IF COL_LENGTH('Alumno', '{column}') IS NULL ALTER TABLE Alumno ADD {column} {sqlServerType};";

                await db.Database.ExecuteSqlRawAsync(sql, ct);
            }
            catch (Exception ex) when (isSqlite && ex.Message.Contains("duplicate column", StringComparison.OrdinalIgnoreCase))
            {
                // Column already exists in SQLite.
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "No se pudo aplicar parche de columna {Column} en Alumno.", column);
            }
        }
    }
}
