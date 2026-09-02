export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Empresa {
  empresaId: number;
  crmEmpresaId: string;
  ruc: string;
  razonSocial: string;
  categoria?: string;
  activo: boolean;
  ultimaSyncUtc: string;
  correo?: string;
  telefono?: string;
  paginaWeb?: string;
  ejecutivoComercial?: string;
  promotor?: string;
  gerencia?: string;
  comite?: string;
  estadoCrm?: string;
  fechaAltaCrm?: string;
  crmCreatedOn?: string;
}

export interface EmpresaSyncEstado {
  ultimoInicio?: string | null;
  ultimoFin?: string | null;
  siguienteInicioSugerido?: string | null;
  offsetMinutos: number;
}

export interface EmpresaSyncPreviewItem {
  crmEmpresaId: string;
  ruc: string;
  razonSocial: string;
  categoria?: string;
  activo: boolean;
  actualizadoUtc: string;
  yaExisteLocal: boolean;
  correo?: string;
  promotor?: string;
  crmCreatedOn?: string;
}

export interface EmpresaSyncPreview {
  items: EmpresaSyncPreviewItem[];
  total: number;
  inicio: string;
  fin: string;
}

export interface EmpresaSyncResult {
  procesadas: number;
  nuevas: number;
  actualizadas: number;
  inicio: string;
  fin: string;
}

export interface PuntosResumen {
  generados: number;
  canjeados: number;
  disponibles: number;
  proximosAVencer: number;
  vencidos: number;
}

export interface EmpresaDetalle {
  empresa: Empresa;
  puntos: PuntosResumen;
}

export interface Alumno {
  alumnoId: number;
  codigoAlumno: string;
  nombres: string;
  apellidos: string;
  carrera?: string;
  ciclo?: string;
  telefono?: string;
  correo?: string;
}

export interface Contratacion {
  contratacionId: number;
  empresaId: number;
  empresaRazonSocial: string;
  alumnoId: number;
  alumnoNombre: string;
  sectoristaId?: number;
  anio: number;
  categoria?: string;
  perfilSolicitado?: string;
  mesContratacion: number;
  fechaInicio: string;
  fechaFin: string;
  sueldo: number;
  estado: string;
  puntosGenerados: number;
}

export interface Beneficio {
  beneficioId: number;
  nombre: string;
  descripcion?: string;
  tipo?: string;
  costoPuntos: number;
  activo: boolean;
}

export interface Canje {
  canjeId: number;
  empresaId: number;
  empresaRuc: string;
  empresaRazonSocial: string;
  beneficioId: number;
  beneficioNombre: string;
  puntosUsados: number;
  estado: string;
  fechaSolicitudUtc: string;
}

export interface PuntoMovimiento {
  movimientoId: number;
  empresaId: number;
  contratacionId?: number;
  canjeId?: number;
  tipo: string;
  puntos: number;
  fechaMovimientoUtc: string;
  fechaVencimiento?: string;
  estado: string;
  observacion?: string;
}

export interface CargaMasiva {
  cargaId: number;
  nombreArchivo: string;
  usuario: string;
  estado: string;
  totalFilas: number;
  filasValidas: number;
  filasInvalidas: number;
  filasProcesadas: number;
  creadoUtc: string;
}

export interface CargaDetalle {
  detalleId: number;
  numeroFila: number;
  esValido: boolean;
  errores?: string;
  procesado: boolean;
  payloadJson: string;
  ruc: string;
  codigoAlumno: string;
  nombres: string;
  apellidos: string;
  fechaInicio: string;
  fechaFin: string;
  sueldo: string;
  anio: string;
}

export interface PlantillaCorreo {
  plantillaId: number;
  codigo: string;
  asunto: string;
  cuerpoHtml: string;
  variables?: string;
  activo: boolean;
}

export interface CorreoEnviado {
  correoId: number;
  destinatario: string;
  asunto: string;
  estado: string;
  intentos: number;
  creadoUtc: string;
  enviadoUtc?: string;
  error?: string;
}

export interface Auditoria {
  auditoriaId: number;
  usuario: string;
  fechaUtc: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  valorAnterior?: string;
  valorNuevo?: string;
}

export interface DashboardKpis {
  empresasActivas: number;
  alumnosContratados: number;
  contratacionesVigentes: number;
  contratacionesVencidas: number;
  puntosGenerados: number;
  puntosUtilizados: number;
  puntosDisponibles: number;
  puntosProximosAVencer: number;
  puntosVencidos: number;
  canjesRealizados: number;
  beneficiosDisponibles: number;
}

export interface DashboardEmpresaFila {
  empresaId: number;
  empresa: string;
  alumnos: number;
  nuevos: number;
  contrataciones: number;
  puntosGenerados: number;
  vigentes: number;
  vencidas: number;
  canjes: number;
  puntosCanjeados: number;
  puntosDisponibles: number;
  puntosPorCanje: number;
}

export interface DashboardDistribucionItem {
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
  puntos: number;
  costoUnitario: number;
}

export interface DashboardDistribucion {
  vigentes: DashboardDistribucionItem;
  canjes: DashboardDistribucionItem;
  vencidas: DashboardDistribucionItem;
  totalOperaciones: number;
}

export interface DashboardCalculo {
  puntosGenerados: number;
  puntosCanjeados: number;
  puntosVencidos: number;
  saldoNeto: number;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  filasEmpresa: DashboardEmpresaFila[];
  distribucion: DashboardDistribucion;
  calculo: DashboardCalculo;
}
