import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { ShellComponent } from './core/shell.component';
import { LoginComponent } from './features/login/login.component';
import { ForbiddenComponent } from './features/forbidden/forbidden.component';

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
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'empresas',
        loadComponent: () => import('./features/empresas/empresas.component').then(m => m.EmpresasComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'empresas/:id',
        loadComponent: () => import('./features/empresas/empresa-detalle.component').then(m => m.EmpresaDetalleComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'alumnos',
        loadComponent: () => import('./features/alumnos/alumnos.component').then(m => m.AlumnosComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'contrataciones',
        loadComponent: () => import('./features/contrataciones/contrataciones.component').then(m => m.ContratacionesComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'puntos',
        loadComponent: () => import('./features/puntos/puntos.component').then(m => m.PuntosComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'beneficios',
        loadComponent: () => import('./features/beneficios/beneficios.component').then(m => m.BeneficiosComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'canjes',
        loadComponent: () => import('./features/canjes/canjes.component').then(m => m.CanjesComponent),
        canActivate: [roleGuard],
        data: { roles: allRoles }
      },
      {
        path: 'cargas',
        loadComponent: () => import('./features/cargas/cargas.component').then(m => m.CargasComponent),
        canActivate: [roleGuard],
        data: { roles: operacionRoles }
      },
      {
        path: 'comunicaciones',
        loadComponent: () => import('./features/comunicaciones/comunicaciones.component').then(m => m.ComunicacionesComponent),
        canActivate: [roleGuard],
        data: { roles: ['Administrador'] }
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
        canActivate: [roleGuard],
        data: { roles: ['Administrador'] }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
