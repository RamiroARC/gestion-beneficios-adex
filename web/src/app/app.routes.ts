import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { ShellComponent } from './core/shell.component';
import { LoginComponent } from './features/login/login.component';
import { ForbiddenComponent } from './features/forbidden/forbidden.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EmpresasComponent } from './features/empresas/empresas.component';
import { EmpresaDetalleComponent } from './features/empresas/empresa-detalle.component';
import { AlumnosComponent } from './features/alumnos/alumnos.component';
import { ContratacionesComponent } from './features/contrataciones/contrataciones.component';
import { PuntosComponent } from './features/puntos/puntos.component';
import { BeneficiosComponent } from './features/beneficios/beneficios.component';
import { CanjesComponent } from './features/canjes/canjes.component';
import { CargasComponent } from './features/cargas/cargas.component';
import { ComunicacionesComponent } from './features/comunicaciones/comunicaciones.component';
import { AuditoriaComponent } from './features/auditoria/auditoria.component';

const allRoles = ['Administrador', 'Operador', 'Consulta', 'GestionBeneficios'] as const;
const operacionRoles = ['Administrador', 'Operador'] as const;

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'forbidden', component: ForbiddenComponent },
      { path: 'dashboard', component: DashboardComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'empresas', component: EmpresasComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'empresas/:id', component: EmpresaDetalleComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'alumnos', component: AlumnosComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'contrataciones', component: ContratacionesComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'puntos', component: PuntosComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'beneficios', component: BeneficiosComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'canjes', component: CanjesComponent, canActivate: [roleGuard], data: { roles: allRoles } },
      { path: 'cargas', component: CargasComponent, canActivate: [roleGuard], data: { roles: operacionRoles } },
      { path: 'comunicaciones', component: ComunicacionesComponent, canActivate: [roleGuard], data: { roles: ['Administrador'] } },
      { path: 'auditoria', component: AuditoriaComponent, canActivate: [roleGuard], data: { roles: ['Administrador'] } }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
