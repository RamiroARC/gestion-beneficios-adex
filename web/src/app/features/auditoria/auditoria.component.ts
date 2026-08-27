import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/api.service';
import { Auditoria } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

const AUDIT_MODULES: { label: string; entidad: string }[] = [
  { label: 'Todos', entidad: '' },
  { label: 'Empresas', entidad: 'EmpresaAsociada' },
  { label: 'Alumnos', entidad: 'Alumno' },
  { label: 'Contrataciones', entidad: 'Contratacion' },
  { label: 'Puntos', entidad: 'PuntoLote' },
  { label: 'Beneficios', entidad: 'Beneficio' },
  { label: 'Canjes', entidad: 'Canje' },
  { label: 'Carga masiva', entidad: 'CargaMasiva' }
];

function moduloLabel(entidad: string): string {
  return AUDIT_MODULES.find((m) => m.entidad === entidad)?.label ?? (entidad || 'Otros');
}

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    MatTableModule,
    DatePipe,
    MatCardModule,
    MatPaginatorModule,
    MatChipsModule,
    MatExpansionModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="Auditoría" subtitle="Trazabilidad de cambios críticos, agrupada por módulo." />

      <mat-card appearance="outlined">
        <mat-card-content>
          <mat-chip-set class="module-chips">
            @for (m of modules; track m.label) {
              <mat-chip
                [highlighted]="entidad() === m.entidad"
                (click)="selectModule(m.entidad)"
              >
                {{ m.label }}
              </mat-chip>
            }
          </mat-chip-set>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay eventos de auditoría en este módulo." icon="history" />
        } @else if (!entidad()) {
          <mat-accordion>
            @for (group of groups(); track group.modulo) {
              <mat-expansion-panel>
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ group.modulo }}</mat-panel-title>
                  <mat-panel-description>{{ group.items.length }} evento(s)</mat-panel-description>
                </mat-expansion-panel-header>
                <div class="table-wrap">
                  <table mat-table [dataSource]="group.items">
                    <ng-container matColumnDef="fecha"><th mat-header-cell *matHeaderCellDef>Fecha</th><td mat-cell *matCellDef="let a">{{ a.fechaUtc | date:'short' }}</td></ng-container>
                    <ng-container matColumnDef="usuario"><th mat-header-cell *matHeaderCellDef>Usuario</th><td mat-cell *matCellDef="let a">{{ a.usuario }}</td></ng-container>
                    <ng-container matColumnDef="accion"><th mat-header-cell *matHeaderCellDef>Acción</th><td mat-cell *matCellDef="let a">{{ a.accion }}</td></ng-container>
                    <ng-container matColumnDef="entidad"><th mat-header-cell *matHeaderCellDef>Registro</th><td mat-cell *matCellDef="let a">{{ a.entidad }} #{{ a.entidadId }}</td></ng-container>
                    <tr mat-header-row *matHeaderRowDef="cols"></tr>
                    <tr mat-row *matRowDef="let row; columns: cols"></tr>
                  </table>
                </div>
              </mat-expansion-panel>
            }
          </mat-accordion>
          <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="fecha"><th mat-header-cell *matHeaderCellDef>Fecha</th><td mat-cell *matCellDef="let a">{{ a.fechaUtc | date:'short' }}</td></ng-container>
              <ng-container matColumnDef="usuario"><th mat-header-cell *matHeaderCellDef>Usuario</th><td mat-cell *matCellDef="let a">{{ a.usuario }}</td></ng-container>
              <ng-container matColumnDef="accion"><th mat-header-cell *matHeaderCellDef>Acción</th><td mat-cell *matCellDef="let a">{{ a.accion }}</td></ng-container>
              <ng-container matColumnDef="entidad"><th mat-header-cell *matHeaderCellDef>Registro</th><td mat-cell *matCellDef="let a">{{ a.entidad }} #{{ a.entidadId }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          </div>
          <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
        }
      </mat-card>
    </section>
  `,
  styles: `
    .module-chips { display: flex; flex-wrap: wrap; gap: var(--gb-space-2); }
    mat-accordion { display: block; padding: var(--gb-space-3); }
  `
})
export class AuditoriaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);

  readonly modules = AUDIT_MODULES;
  entidad = signal('');
  items = signal<Auditoria[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 50;
  loading = signal(true);
  cols = ['fecha', 'usuario', 'accion', 'entidad'];

  groups = computed(() => {
    const map = new Map<string, Auditoria[]>();
    for (const item of this.items()) {
      const key = moduloLabel(item.entidad);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].map(([modulo, items]) => ({ modulo, items }));
  });

  ngOnInit(): void {
    this.load();
  }

  selectModule(entidad: string): void {
    this.entidad.set(entidad);
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.auditoria(this.entidad(), this.page(), this.pageSize).subscribe({
      next: (r) => {
        this.items.set(r.items ?? []);
        this.total.set(r.total ?? 0);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudo cargar la auditoría.'));
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }
}
