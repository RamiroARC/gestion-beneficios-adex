using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionBeneficios.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Alumno",
                columns: table => new
                {
                    AlumnoId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CodigoAlumno = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CrmAlumnoCodigo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Dni = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Nombres = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Apellidos = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Carrera = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Ciclo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Telefono = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Correo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EmailPersonal = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Modalidad = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FechaNacimiento = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Denominacion = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UltimaSyncUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreadoUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alumno", x => x.AlumnoId);
                });

            migrationBuilder.CreateTable(
                name: "Auditoria",
                columns: table => new
                {
                    AuditoriaId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Usuario = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FechaUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Accion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Entidad = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EntidadId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ValorAnterior = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ValorNuevo = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Auditoria", x => x.AuditoriaId);
                });

            migrationBuilder.CreateTable(
                name: "Beneficio",
                columns: table => new
                {
                    BeneficioId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Tipo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CostoPuntos = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Beneficio", x => x.BeneficioId);
                });

            migrationBuilder.CreateTable(
                name: "CargaMasiva",
                columns: table => new
                {
                    CargaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NombreArchivo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Usuario = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Estado = table.Column<int>(type: "int", nullable: false),
                    TotalFilas = table.Column<int>(type: "int", nullable: false),
                    FilasValidas = table.Column<int>(type: "int", nullable: false),
                    FilasInvalidas = table.Column<int>(type: "int", nullable: false),
                    FilasProcesadas = table.Column<int>(type: "int", nullable: false),
                    CreadoUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletadoUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CargaMasiva", x => x.CargaId);
                });

            migrationBuilder.CreateTable(
                name: "ConfiguracionSistema",
                columns: table => new
                {
                    ConfiguracionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Clave = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Valor = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracionSistema", x => x.ConfiguracionId);
                });

            migrationBuilder.CreateTable(
                name: "CorreoEnviado",
                columns: table => new
                {
                    CorreoId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlantillaId = table.Column<int>(type: "int", nullable: true),
                    Destinatario = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Asunto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CuerpoHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Estado = table.Column<int>(type: "int", nullable: false),
                    Intentos = table.Column<int>(type: "int", nullable: false),
                    Error = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreadoUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EnviadoUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorreoEnviado", x => x.CorreoId);
                });

            migrationBuilder.CreateTable(
                name: "EmpresaAsociada",
                columns: table => new
                {
                    EmpresaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CrmEmpresaId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Ruc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RazonSocial = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Categoria = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Activo = table.Column<bool>(type: "bit", nullable: false),
                    UltimaSyncUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Telefono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PaginaWeb = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    EjecutivoComercial = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Promotor = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Gerencia = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Comite = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    EstadoCrm = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FechaAltaCrm = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CrmCreatedOn = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmpresaAsociada", x => x.EmpresaId);
                });

            migrationBuilder.CreateTable(
                name: "PlantillaCorreo",
                columns: table => new
                {
                    PlantillaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Codigo = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Asunto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CuerpoHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Variables = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Activo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlantillaCorreo", x => x.PlantillaId);
                });

            migrationBuilder.CreateTable(
                name: "PuntoLote",
                columns: table => new
                {
                    LoteId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmpresaId = table.Column<int>(type: "int", nullable: false),
                    ContratacionId = table.Column<int>(type: "int", nullable: false),
                    PuntosOriginales = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PuntosDisponibles = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    FechaVencimiento = table.Column<DateOnly>(type: "date", nullable: false),
                    CreadoUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PuntoLote", x => x.LoteId);
                });

            migrationBuilder.CreateTable(
                name: "Sectorista",
                columns: table => new
                {
                    SectoristaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Correo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Activo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sectorista", x => x.SectoristaId);
                });

            migrationBuilder.CreateTable(
                name: "CargaMasivaDetalle",
                columns: table => new
                {
                    DetalleId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CargaId = table.Column<int>(type: "int", nullable: false),
                    NumeroFila = table.Column<int>(type: "int", nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EsValido = table.Column<bool>(type: "bit", nullable: false),
                    Errores = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Procesado = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CargaMasivaDetalle", x => x.DetalleId);
                    table.ForeignKey(
                        name: "FK_CargaMasivaDetalle_CargaMasiva_CargaId",
                        column: x => x.CargaId,
                        principalTable: "CargaMasiva",
                        principalColumn: "CargaId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Canje",
                columns: table => new
                {
                    CanjeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmpresaId = table.Column<int>(type: "int", nullable: false),
                    BeneficioId = table.Column<int>(type: "int", nullable: false),
                    PuntosUsados = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<int>(type: "int", nullable: false),
                    FechaSolicitudUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaProcesoUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SolicitadoPor = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Canje", x => x.CanjeId);
                    table.ForeignKey(
                        name: "FK_Canje_Beneficio_BeneficioId",
                        column: x => x.BeneficioId,
                        principalTable: "Beneficio",
                        principalColumn: "BeneficioId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Canje_EmpresaAsociada_EmpresaId",
                        column: x => x.EmpresaId,
                        principalTable: "EmpresaAsociada",
                        principalColumn: "EmpresaId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Contratacion",
                columns: table => new
                {
                    ContratacionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmpresaId = table.Column<int>(type: "int", nullable: false),
                    AlumnoId = table.Column<int>(type: "int", nullable: false),
                    SectoristaId = table.Column<int>(type: "int", nullable: true),
                    Anio = table.Column<int>(type: "int", nullable: false),
                    Categoria = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PerfilSolicitado = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MesContratacion = table.Column<int>(type: "int", nullable: false),
                    FechaInicio = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaFin = table.Column<DateOnly>(type: "date", nullable: false),
                    Sueldo = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<int>(type: "int", nullable: false),
                    PuntosGenerados = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreadoUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActualizadoUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contratacion", x => x.ContratacionId);
                    table.ForeignKey(
                        name: "FK_Contratacion_Alumno_AlumnoId",
                        column: x => x.AlumnoId,
                        principalTable: "Alumno",
                        principalColumn: "AlumnoId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Contratacion_EmpresaAsociada_EmpresaId",
                        column: x => x.EmpresaId,
                        principalTable: "EmpresaAsociada",
                        principalColumn: "EmpresaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Contratacion_Sectorista_SectoristaId",
                        column: x => x.SectoristaId,
                        principalTable: "Sectorista",
                        principalColumn: "SectoristaId");
                });

            migrationBuilder.CreateTable(
                name: "PuntoMovimiento",
                columns: table => new
                {
                    MovimientoId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmpresaId = table.Column<int>(type: "int", nullable: false),
                    ContratacionId = table.Column<int>(type: "int", nullable: true),
                    CanjeId = table.Column<int>(type: "int", nullable: true),
                    LoteId = table.Column<int>(type: "int", nullable: true),
                    Tipo = table.Column<int>(type: "int", nullable: false),
                    Puntos = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    FechaMovimientoUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaVencimiento = table.Column<DateOnly>(type: "date", nullable: true),
                    Estado = table.Column<int>(type: "int", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Observacion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EmpresaAsociadaEmpresaId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PuntoMovimiento", x => x.MovimientoId);
                    table.ForeignKey(
                        name: "FK_PuntoMovimiento_Contratacion_ContratacionId",
                        column: x => x.ContratacionId,
                        principalTable: "Contratacion",
                        principalColumn: "ContratacionId");
                    table.ForeignKey(
                        name: "FK_PuntoMovimiento_EmpresaAsociada_EmpresaAsociadaEmpresaId",
                        column: x => x.EmpresaAsociadaEmpresaId,
                        principalTable: "EmpresaAsociada",
                        principalColumn: "EmpresaId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Alumno_CodigoAlumno",
                table: "Alumno",
                column: "CodigoAlumno",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Alumno_CrmAlumnoCodigo",
                table: "Alumno",
                column: "CrmAlumnoCodigo");

            migrationBuilder.CreateIndex(
                name: "IX_Alumno_Dni",
                table: "Alumno",
                column: "Dni");

            migrationBuilder.CreateIndex(
                name: "IX_Auditoria_Entidad_FechaUtc",
                table: "Auditoria",
                columns: new[] { "Entidad", "FechaUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Canje_BeneficioId",
                table: "Canje",
                column: "BeneficioId");

            migrationBuilder.CreateIndex(
                name: "IX_Canje_EmpresaId",
                table: "Canje",
                column: "EmpresaId");

            migrationBuilder.CreateIndex(
                name: "IX_Canje_IdempotencyKey",
                table: "Canje",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CargaMasivaDetalle_CargaId",
                table: "CargaMasivaDetalle",
                column: "CargaId");

            migrationBuilder.CreateIndex(
                name: "IX_ConfiguracionSistema_Clave",
                table: "ConfiguracionSistema",
                column: "Clave",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contratacion_AlumnoId_FechaInicio",
                table: "Contratacion",
                columns: new[] { "AlumnoId", "FechaInicio" });

            migrationBuilder.CreateIndex(
                name: "IX_Contratacion_EmpresaId_FechaInicio",
                table: "Contratacion",
                columns: new[] { "EmpresaId", "FechaInicio" });

            migrationBuilder.CreateIndex(
                name: "IX_Contratacion_Estado",
                table: "Contratacion",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_Contratacion_FechaFin",
                table: "Contratacion",
                column: "FechaFin");

            migrationBuilder.CreateIndex(
                name: "IX_Contratacion_SectoristaId",
                table: "Contratacion",
                column: "SectoristaId");

            migrationBuilder.CreateIndex(
                name: "IX_CorreoEnviado_Estado",
                table: "CorreoEnviado",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_EmpresaAsociada_CrmEmpresaId",
                table: "EmpresaAsociada",
                column: "CrmEmpresaId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmpresaAsociada_RazonSocial",
                table: "EmpresaAsociada",
                column: "RazonSocial");

            migrationBuilder.CreateIndex(
                name: "IX_EmpresaAsociada_Ruc",
                table: "EmpresaAsociada",
                column: "Ruc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlantillaCorreo_Codigo",
                table: "PlantillaCorreo",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PuntoLote_EmpresaId_FechaVencimiento",
                table: "PuntoLote",
                columns: new[] { "EmpresaId", "FechaVencimiento" });

            migrationBuilder.CreateIndex(
                name: "IX_PuntoMovimiento_ContratacionId",
                table: "PuntoMovimiento",
                column: "ContratacionId");

            migrationBuilder.CreateIndex(
                name: "IX_PuntoMovimiento_EmpresaAsociadaEmpresaId",
                table: "PuntoMovimiento",
                column: "EmpresaAsociadaEmpresaId");

            migrationBuilder.CreateIndex(
                name: "IX_PuntoMovimiento_EmpresaId_Estado_FechaVencimiento",
                table: "PuntoMovimiento",
                columns: new[] { "EmpresaId", "Estado", "FechaVencimiento" });

            migrationBuilder.CreateIndex(
                name: "IX_PuntoMovimiento_IdempotencyKey",
                table: "PuntoMovimiento",
                column: "IdempotencyKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Auditoria");

            migrationBuilder.DropTable(
                name: "Canje");

            migrationBuilder.DropTable(
                name: "CargaMasivaDetalle");

            migrationBuilder.DropTable(
                name: "ConfiguracionSistema");

            migrationBuilder.DropTable(
                name: "CorreoEnviado");

            migrationBuilder.DropTable(
                name: "PlantillaCorreo");

            migrationBuilder.DropTable(
                name: "PuntoLote");

            migrationBuilder.DropTable(
                name: "PuntoMovimiento");

            migrationBuilder.DropTable(
                name: "Beneficio");

            migrationBuilder.DropTable(
                name: "CargaMasiva");

            migrationBuilder.DropTable(
                name: "Contratacion");

            migrationBuilder.DropTable(
                name: "Alumno");

            migrationBuilder.DropTable(
                name: "EmpresaAsociada");

            migrationBuilder.DropTable(
                name: "Sectorista");
        }
    }
}
