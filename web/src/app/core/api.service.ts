import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  Alumno,
  AlumnoSyncEstado,
  AlumnoSyncPreview,
  AlumnoSyncResult,
  Auditoria,
  Beneficio,
  Canje,
  CargaDetalle,
  CargaMasiva,
  Contratacion,
  CorreoEnviado,
  DashboardKpis,
  DashboardOverview,
  Empresa,
  EmpresaDetalle,
  EmpresaSyncEstado,
  EmpresaSyncPreview,
  EmpresaSyncResult,
  PagedResult,
  PlantillaCorreo,
  PuntoMovimiento,
  PuntosResumen
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  dashboard() {
    return this.http.get<DashboardKpis>(`${this.base}/dashboard/kpis`);
  }

  dashboardOverview() {
    return this.http.get<DashboardOverview>(`${this.base}/dashboard/overview`);
  }

  empresas(q = '', page = 1, pageSize = 20) {
    return this.http.get<PagedResult<Empresa>>(`${this.base}/empresas`, {
      params: this.pageParams(q, page, pageSize)
    });
  }

  empresa(id: number) {
    return this.http.get<EmpresaDetalle>(`${this.base}/empresas/${id}`);
  }

  updateEmpresa(id: number, body: { razonSocial: string; categoria?: string | null; activo: boolean }) {
    return this.http.put<Empresa>(`${this.base}/empresas/${id}`, body);
  }

  syncEmpresa(ruc: string) {
    return this.http.post<Empresa>(`${this.base}/empresas/sync/${encodeURIComponent(ruc)}`, {});
  }

  empresaSyncCatalogo() {
    return this.http.post<EmpresaSyncResult>(`${this.base}/empresas/sync`, {});
  }

  empresaSyncEstado() {
    return this.http.get<EmpresaSyncEstado>(`${this.base}/empresas/sync/estado`);
  }

  empresaSyncPreview(inicio: string, fin: string) {
    return this.http.post<EmpresaSyncPreview>(`${this.base}/empresas/sync/preview`, { inicio, fin });
  }

  empresaSyncProcesar(inicio: string, fin: string) {
    return this.http.post<EmpresaSyncResult>(`${this.base}/empresas/sync/procesar`, { inicio, fin });
  }

  alumnos(q = '', page = 1, pageSize = 20) {
    return this.http.get<PagedResult<Alumno>>(`${this.base}/alumnos`, {
      params: this.pageParams(q, page, pageSize)
    });
  }

  createAlumno(body: Partial<Alumno>) {
    return this.http.post<Alumno>(`${this.base}/alumnos`, body);
  }

  updateAlumno(id: number, body: Partial<Alumno>) {
    return this.http.put<Alumno>(`${this.base}/alumnos/${id}`, body);
  }

  alumno(id: number) {
    return this.http.get<Alumno>(`${this.base}/alumnos/${id}`);
  }

  syncAlumno(criterio: string) {
    return this.http.post<Alumno>(`${this.base}/alumnos/sync/${encodeURIComponent(criterio)}`, {});
  }

  alumnoSyncCatalogo() {
    return this.http.post<AlumnoSyncResult>(`${this.base}/alumnos/sync`, {});
  }

  alumnoSyncEstado() {
    return this.http.get<AlumnoSyncEstado>(`${this.base}/alumnos/sync/estado`);
  }

  alumnoSyncPreview(inicio: string, fin: string) {
    return this.http.post<AlumnoSyncPreview>(`${this.base}/alumnos/sync/preview`, { inicio, fin });
  }

  alumnoSyncProcesar(inicio: string, fin: string) {
    return this.http.post<AlumnoSyncResult>(`${this.base}/alumnos/sync/procesar`, { inicio, fin });
  }

  contrataciones(empresaId?: number, page = 1, pageSize = 20) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (empresaId) params = params.set('empresaId', empresaId);
    return this.http.get<PagedResult<Contratacion>>(`${this.base}/contrataciones`, { params });
  }

  createContratacion(body: unknown) {
    return this.http.post<Contratacion>(`${this.base}/contrataciones`, body);
  }

  updateContratacion(id: number, body: unknown) {
    return this.http.put<Contratacion>(`${this.base}/contrataciones/${id}`, body);
  }

  puntosResumen(empresaId: number) {
    return this.http.get<PuntosResumen>(`${this.base}/puntos/resumen/${empresaId}`);
  }

  movimientos(empresaId?: number, page = 1, pageSize = 50) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (empresaId) params = params.set('empresaId', empresaId);
    return this.http.get<PagedResult<PuntoMovimiento>>(`${this.base}/puntos/movimientos`, { params });
  }

  beneficios(soloActivos?: boolean, page = 1, pageSize = 50) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (soloActivos !== undefined) params = params.set('soloActivos', soloActivos);
    return this.http.get<PagedResult<Beneficio>>(`${this.base}/beneficios`, { params });
  }

  createBeneficio(body: unknown) {
    return this.http.post<Beneficio>(`${this.base}/beneficios`, body);
  }

  updateBeneficio(id: number, body: unknown) {
    return this.http.put<Beneficio>(`${this.base}/beneficios/${id}`, body);
  }

  canjes(empresaId?: number, page = 1, pageSize = 20) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (empresaId) params = params.set('empresaId', empresaId);
    return this.http.get<PagedResult<Canje>>(`${this.base}/canjes`, { params });
  }

  createCanje(body: { empresaId: number; beneficioId: number; idempotencyKey: string }) {
    return this.http.post<Canje>(`${this.base}/canjes`, body);
  }

  uploadCarga(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CargaMasiva>(`${this.base}/cargas-masivas`, form);
  }

  carga(id: number) {
    return this.http.get<CargaMasiva>(`${this.base}/cargas-masivas/${id}`);
  }

  cargaDetalles(id: number) {
    return this.http.get<CargaDetalle[]>(`${this.base}/cargas-masivas/${id}/detalles`);
  }

  confirmarCarga(id: number) {
    return this.http.post<CargaMasiva>(`${this.base}/cargas-masivas/${id}/confirmar`, {});
  }

  downloadPlantillaCarga() {
    return this.http.get(`${this.base}/cargas-masivas/plantilla`, { responseType: 'blob' });
  }

  plantillas(page = 1, pageSize = 50) {
    return this.http.get<PagedResult<PlantillaCorreo>>(`${this.base}/plantillas-correo`, {
      params: { page, pageSize }
    });
  }

  correos(page = 1, pageSize = 50) {
    return this.http.get<PagedResult<CorreoEnviado>>(`${this.base}/correos-enviados`, {
      params: { page, pageSize }
    });
  }

  auditoria(entidad = '', page = 1, pageSize = 50) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (entidad) params = params.set('entidad', entidad);
    return this.http.get<PagedResult<Auditoria>>(`${this.base}/auditoria`, { params });
  }

  private pageParams(q: string, page: number, pageSize: number) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (q) params = params.set('q', q);
    return params;
  }
}
