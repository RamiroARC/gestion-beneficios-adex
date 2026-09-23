IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [Alumno] (
        [AlumnoId] int NOT NULL IDENTITY,
        [CodigoAlumno] nvarchar(50) NOT NULL,
        [CrmAlumnoCodigo] nvarchar(50) NULL,
        [Dni] nvarchar(20) NULL,
        [Nombres] nvarchar(120) NOT NULL,
        [Apellidos] nvarchar(120) NOT NULL,
        [Carrera] nvarchar(max) NULL,
        [Ciclo] nvarchar(max) NULL,
        [Telefono] nvarchar(max) NULL,
        [Correo] nvarchar(max) NULL,
        [EmailPersonal] nvarchar(250) NULL,
        [Modalidad] nvarchar(100) NULL,
        [FechaNacimiento] datetime2 NULL,
        [Denominacion] nvarchar(200) NULL,
        [UltimaSyncUtc] datetime2 NULL,
        [CreadoUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Alumno] PRIMARY KEY ([AlumnoId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [Auditoria] (
        [AuditoriaId] bigint NOT NULL IDENTITY,
        [Usuario] nvarchar(max) NOT NULL,
        [FechaUtc] datetime2 NOT NULL,
        [Accion] nvarchar(max) NOT NULL,
        [Entidad] nvarchar(450) NOT NULL,
        [EntidadId] nvarchar(max) NULL,
        [ValorAnterior] nvarchar(max) NULL,
        [ValorNuevo] nvarchar(max) NULL,
        CONSTRAINT [PK_Auditoria] PRIMARY KEY ([AuditoriaId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [Beneficio] (
        [BeneficioId] int NOT NULL IDENTITY,
        [Nombre] nvarchar(200) NOT NULL,
        [Descripcion] nvarchar(max) NULL,
        [Tipo] nvarchar(max) NULL,
        [CostoPuntos] decimal(18,2) NOT NULL,
        [Activo] bit NOT NULL,
        CONSTRAINT [PK_Beneficio] PRIMARY KEY ([BeneficioId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [CargaMasiva] (
        [CargaId] int NOT NULL IDENTITY,
        [NombreArchivo] nvarchar(max) NOT NULL,
        [Usuario] nvarchar(max) NOT NULL,
        [Estado] int NOT NULL,
        [TotalFilas] int NOT NULL,
        [FilasValidas] int NOT NULL,
        [FilasInvalidas] int NOT NULL,
        [FilasProcesadas] int NOT NULL,
        [CreadoUtc] datetime2 NOT NULL,
        [CompletadoUtc] datetime2 NULL,
        CONSTRAINT [PK_CargaMasiva] PRIMARY KEY ([CargaId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [ConfiguracionSistema] (
        [ConfiguracionId] int NOT NULL IDENTITY,
        [Clave] nvarchar(450) NOT NULL,
        [Valor] nvarchar(max) NOT NULL,
        [Descripcion] nvarchar(max) NULL,
        CONSTRAINT [PK_ConfiguracionSistema] PRIMARY KEY ([ConfiguracionId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [CorreoEnviado] (
        [CorreoId] bigint NOT NULL IDENTITY,
        [PlantillaId] int NULL,
        [Destinatario] nvarchar(max) NOT NULL,
        [Asunto] nvarchar(max) NOT NULL,
        [CuerpoHtml] nvarchar(max) NOT NULL,
        [Estado] int NOT NULL,
        [Intentos] int NOT NULL,
        [Error] nvarchar(max) NULL,
        [CreadoUtc] datetime2 NOT NULL,
        [EnviadoUtc] datetime2 NULL,
        CONSTRAINT [PK_CorreoEnviado] PRIMARY KEY ([CorreoId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [EmpresaAsociada] (
        [EmpresaId] int NOT NULL IDENTITY,
        [CrmEmpresaId] nvarchar(64) NOT NULL,
        [Ruc] nvarchar(20) NOT NULL,
        [RazonSocial] nvarchar(250) NOT NULL,
        [Categoria] nvarchar(max) NULL,
        [Activo] bit NOT NULL,
        [UltimaSyncUtc] datetime2 NOT NULL,
        [Correo] nvarchar(250) NULL,
        [Telefono] nvarchar(50) NULL,
        [PaginaWeb] nvarchar(250) NULL,
        [EjecutivoComercial] nvarchar(200) NULL,
        [Promotor] nvarchar(200) NULL,
        [Gerencia] nvarchar(200) NULL,
        [Comite] nvarchar(200) NULL,
        [EstadoCrm] nvarchar(100) NULL,
        [FechaAltaCrm] nvarchar(50) NULL,
        [CrmCreatedOn] datetime2 NULL,
        CONSTRAINT [PK_EmpresaAsociada] PRIMARY KEY ([EmpresaId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [PlantillaCorreo] (
        [PlantillaId] int NOT NULL IDENTITY,
        [Codigo] nvarchar(80) NOT NULL,
        [Asunto] nvarchar(max) NOT NULL,
        [CuerpoHtml] nvarchar(max) NOT NULL,
        [Variables] nvarchar(max) NULL,
        [Activo] bit NOT NULL,
        CONSTRAINT [PK_PlantillaCorreo] PRIMARY KEY ([PlantillaId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [PuntoLote] (
        [LoteId] int NOT NULL IDENTITY,
        [EmpresaId] int NOT NULL,
        [ContratacionId] int NOT NULL,
        [PuntosOriginales] decimal(18,2) NOT NULL,
        [PuntosDisponibles] decimal(18,2) NOT NULL,
        [FechaVencimiento] date NOT NULL,
        [CreadoUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_PuntoLote] PRIMARY KEY ([LoteId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [Sectorista] (
        [SectoristaId] int NOT NULL IDENTITY,
        [Nombre] nvarchar(max) NOT NULL,
        [Correo] nvarchar(max) NULL,
        [Activo] bit NOT NULL,
        CONSTRAINT [PK_Sectorista] PRIMARY KEY ([SectoristaId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [CargaMasivaDetalle] (
        [DetalleId] bigint NOT NULL IDENTITY,
        [CargaId] int NOT NULL,
        [NumeroFila] int NOT NULL,
        [PayloadJson] nvarchar(max) NOT NULL,
        [EsValido] bit NOT NULL,
        [Errores] nvarchar(max) NULL,
        [Procesado] bit NOT NULL,
        CONSTRAINT [PK_CargaMasivaDetalle] PRIMARY KEY ([DetalleId]),
        CONSTRAINT [FK_CargaMasivaDetalle_CargaMasiva_CargaId] FOREIGN KEY ([CargaId]) REFERENCES [CargaMasiva] ([CargaId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [Canje] (
        [CanjeId] int NOT NULL IDENTITY,
        [EmpresaId] int NOT NULL,
        [BeneficioId] int NOT NULL,
        [PuntosUsados] decimal(18,2) NOT NULL,
        [Estado] int NOT NULL,
        [FechaSolicitudUtc] datetime2 NOT NULL,
        [FechaProcesoUtc] datetime2 NULL,
        [IdempotencyKey] nvarchar(120) NOT NULL,
        [SolicitadoPor] nvarchar(max) NULL,
        CONSTRAINT [PK_Canje] PRIMARY KEY ([CanjeId]),
        CONSTRAINT [FK_Canje_Beneficio_BeneficioId] FOREIGN KEY ([BeneficioId]) REFERENCES [Beneficio] ([BeneficioId]) ON DELETE CASCADE,
        CONSTRAINT [FK_Canje_EmpresaAsociada_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [EmpresaAsociada] ([EmpresaId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [Contratacion] (
        [ContratacionId] int NOT NULL IDENTITY,
        [EmpresaId] int NOT NULL,
        [AlumnoId] int NOT NULL,
        [SectoristaId] int NULL,
        [Anio] int NOT NULL,
        [Categoria] nvarchar(max) NULL,
        [PerfilSolicitado] nvarchar(max) NULL,
        [MesContratacion] int NOT NULL,
        [FechaInicio] date NOT NULL,
        [FechaFin] date NOT NULL,
        [Sueldo] decimal(18,2) NOT NULL,
        [Estado] int NOT NULL,
        [PuntosGenerados] decimal(18,2) NOT NULL,
        [CreadoUtc] datetime2 NOT NULL,
        [ActualizadoUtc] datetime2 NULL,
        CONSTRAINT [PK_Contratacion] PRIMARY KEY ([ContratacionId]),
        CONSTRAINT [FK_Contratacion_Alumno_AlumnoId] FOREIGN KEY ([AlumnoId]) REFERENCES [Alumno] ([AlumnoId]) ON DELETE CASCADE,
        CONSTRAINT [FK_Contratacion_EmpresaAsociada_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [EmpresaAsociada] ([EmpresaId]) ON DELETE CASCADE,
        CONSTRAINT [FK_Contratacion_Sectorista_SectoristaId] FOREIGN KEY ([SectoristaId]) REFERENCES [Sectorista] ([SectoristaId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE TABLE [PuntoMovimiento] (
        [MovimientoId] bigint NOT NULL IDENTITY,
        [EmpresaId] int NOT NULL,
        [ContratacionId] int NULL,
        [CanjeId] int NULL,
        [LoteId] int NULL,
        [Tipo] int NOT NULL,
        [Puntos] decimal(18,2) NOT NULL,
        [FechaMovimientoUtc] datetime2 NOT NULL,
        [FechaVencimiento] date NULL,
        [Estado] int NOT NULL,
        [IdempotencyKey] nvarchar(120) NOT NULL,
        [Observacion] nvarchar(max) NULL,
        [EmpresaAsociadaEmpresaId] int NULL,
        CONSTRAINT [PK_PuntoMovimiento] PRIMARY KEY ([MovimientoId]),
        CONSTRAINT [FK_PuntoMovimiento_Contratacion_ContratacionId] FOREIGN KEY ([ContratacionId]) REFERENCES [Contratacion] ([ContratacionId]),
        CONSTRAINT [FK_PuntoMovimiento_EmpresaAsociada_EmpresaAsociadaEmpresaId] FOREIGN KEY ([EmpresaAsociadaEmpresaId]) REFERENCES [EmpresaAsociada] ([EmpresaId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Alumno_CodigoAlumno] ON [Alumno] ([CodigoAlumno]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Alumno_CrmAlumnoCodigo] ON [Alumno] ([CrmAlumnoCodigo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Alumno_Dni] ON [Alumno] ([Dni]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Auditoria_Entidad_FechaUtc] ON [Auditoria] ([Entidad], [FechaUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Canje_BeneficioId] ON [Canje] ([BeneficioId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Canje_EmpresaId] ON [Canje] ([EmpresaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Canje_IdempotencyKey] ON [Canje] ([IdempotencyKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_CargaMasivaDetalle_CargaId] ON [CargaMasivaDetalle] ([CargaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ConfiguracionSistema_Clave] ON [ConfiguracionSistema] ([Clave]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Contratacion_AlumnoId_FechaInicio] ON [Contratacion] ([AlumnoId], [FechaInicio]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Contratacion_EmpresaId_FechaInicio] ON [Contratacion] ([EmpresaId], [FechaInicio]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Contratacion_Estado] ON [Contratacion] ([Estado]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Contratacion_FechaFin] ON [Contratacion] ([FechaFin]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Contratacion_SectoristaId] ON [Contratacion] ([SectoristaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_CorreoEnviado_Estado] ON [CorreoEnviado] ([Estado]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EmpresaAsociada_CrmEmpresaId] ON [EmpresaAsociada] ([CrmEmpresaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_EmpresaAsociada_RazonSocial] ON [EmpresaAsociada] ([RazonSocial]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EmpresaAsociada_Ruc] ON [EmpresaAsociada] ([Ruc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PlantillaCorreo_Codigo] ON [PlantillaCorreo] ([Codigo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PuntoLote_EmpresaId_FechaVencimiento] ON [PuntoLote] ([EmpresaId], [FechaVencimiento]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PuntoMovimiento_ContratacionId] ON [PuntoMovimiento] ([ContratacionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PuntoMovimiento_EmpresaAsociadaEmpresaId] ON [PuntoMovimiento] ([EmpresaAsociadaEmpresaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PuntoMovimiento_EmpresaId_Estado_FechaVencimiento] ON [PuntoMovimiento] ([EmpresaId], [Estado], [FechaVencimiento]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PuntoMovimiento_IdempotencyKey] ON [PuntoMovimiento] ([IdempotencyKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923020343_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260923020343_InitialCreate', N'10.0.11');
END;

COMMIT;
GO

