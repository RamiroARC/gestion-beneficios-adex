import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { Empresa, PuntoMovimiento, PuntosResumen, DashboardCalculo, DashboardDistribucion } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { DashboardDistribucionComponent } from '../../shared/dashboard-distribucion.component';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-puntos',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    DashboardDistribucionComponent,
    PageHeaderComponent,
    KpiCardComponent,
    StatusChipComponent,
    EmptyStateComponent,
    LoadingStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header
        title="Ledger de puntos"
        subtitle="Empresas asociadas. Usa el ícono de ojo para consultar saldo y movimientos."
      />

      @if (!selectedEmpresa()) {
        <mat-card appearance="outlined">
          <mat-card-content class="toolbar-filters">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="form-grid__wide">
              <mat-label>Buscar RUC / razón social</mat-label>
              <input matInput [(ngModel)]="q" (keyup.enter)="search()" />
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="search()">Buscar</button>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="table-card">
          @if (loadingEmpresas()) {
            <app-loading-state />
          } @else if (empresas().length === 0) {
            <app-empty-state message="No hay empresas asociadas." icon="business" />
          } @else {
            <div class="table-wrap">
              <table mat-table [dataSource]="empresas()">
                <ng-container matColumnDef="ruc">
                  <th mat-header-cell *matHeaderCellDef>RUC</th>
                  <td mat-cell *matCellDef="let e">{{ e.ruc }}</td>
                </ng-container>
                <ng-container matColumnDef="razonSocial">
                  <th mat-header-cell *matHeaderCellDef>Razón social</th>
                  <td mat-cell *matCellDef="let e">{{ e.razonSocial }}</td>
                </ng-container>
                <ng-container matColumnDef="categoria">
                  <th mat-header-cell *matHeaderCellDef>Categoría</th>
                  <td mat-cell *matCellDef="let e">{{ e.categoria || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="activo">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let e">
                    <app-status-chip [status]="e.activo ? 'Activo' : 'Inactivo'" />
                  </td>
                </ng-container>
                <ng-container matColumnDef="ver">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let e" class="col-actions">
                    <button
                      mat-icon-button
                      type="button"
                      matTooltip="Consultar ledger"
                      aria-label="Consultar ledger"
                      (click)="consultar(e)"
                    >
                      <mat-icon>visibility</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="empresaCols"></tr>
                <tr mat-row *matRowDef="let row; columns: empresaCols"></tr>
              </table>
            </div>
            <mat-paginator
              [length]="empresasTotal()"
              [pageIndex]="empresasPage() - 1"
              [pageSize]="empresasPageSize"
              [pageSizeOptions]="[10, 20, 50]"
              (page)="onEmpresasPage($event)"
              showFirstLastButtons
            />
          }
        </mat-card>
      } @else {
        <mat-card appearance="outlined" class="detail-header">
          <mat-card-content>
            <button mat-stroked-button type="button" (click)="volver()">
              <mat-icon>arrow_back</mat-icon>
              Volver al listado
            </button>
            <div class="detail-header__meta">
              <strong>{{ selectedEmpresa()!.razonSocial }}</strong>
              <span>RUC {{ selectedEmpresa()!.ruc }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        @if (loadingDetalle()) {
          <app-loading-state />
        } @else if (resumen(); as r) {
          <div class="dashboard-kpi-row puntos-kpi-row">
            <app-kpi-card
              label="Disponibles"
              [value]="fmt(r.disponibles)"
              icon="account_balance_wallet"
              [subtitle]="pct(r.disponibles, r.generados) + '% del generado'"
              [progress]="pct(r.disponibles, r.generados)"
              tone="default"
            />
            <app-kpi-card
              label="Generados"
              [value]="fmt(r.generados)"
              icon="stars"
              subtitle="Acumulación total"
              tone="info"
            />
            <app-kpi-card
              label="Canjeados"
              [value]="fmt(r.canjeados)"
              icon="redeem"
              [subtitle]="pct(r.canjeados, r.generados) + '% utilizado'"
              [progress]="pct(r.canjeados, r.generados)"
              tone="warning"
            />
            <app-kpi-card
              label="Próx. vencer"
              [value]="fmt(r.proximosAVencer)"
              icon="schedule"
              [badge]="r.proximosAVencer > 0 ? 'Atención' : 'Al día'"
              [tone]="r.proximosAVencer > 0 ? 'danger' : 'success'"
            />
            <app-kpi-card
              label="Vencidos"
              [value]="fmt(r.vencidos)"
              icon="hourglass_disabled"
              [badge]="r.vencidos > 0 ? 'Revisar' : 'Sin vencidos'"
              tone="danger"
            />
          </div>
          <div class="dashboard-body puntos-body">
            <mat-card appearance="outlined" class="table-card">
              @if (movimientos().length === 0) {
                <app-empty-state message="Sin movimientos para esta empresa." icon="stars" />
              } @else {
                <div class="table-wrap">
                  <table mat-table [dataSource]="movimientos()">
                    <ng-container matColumnDef="fecha">
                      <th mat-header-cell *matHeaderCellDef>Fecha</th>
                      <td mat-cell *matCellDef="let m">{{ m.fechaMovimientoUtc | date:'short' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="tipo">
                      <th mat-header-cell *matHeaderCellDef>Tipo</th>
                      <td mat-cell *matCellDef="let m">{{ m.tipo }}</td>
                    </ng-container>
                    <ng-container matColumnDef="puntos">
                      <th mat-header-cell *matHeaderCellDef>Puntos</th>
                      <td mat-cell *matCellDef="let m">{{ m.puntos }}</td>
                    </ng-container>
                    <ng-container matColumnDef="estado">
                      <th mat-header-cell *matHeaderCellDef>Estado</th>
                      <td mat-cell *matCellDef="let m"><app-status-chip [status]="m.estado" /></td>
                    </ng-container>
                    <ng-container matColumnDef="vence">
                      <th mat-header-cell *matHeaderCellDef>Vence</th>
                      <td mat-cell *matCellDef="let m">{{ m.fechaVencimiento }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="movCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: movCols"></tr>
                  </table>
                </div>
                <mat-paginator
                  [length]="movimientosTotal()"
                  [pageIndex]="movimientosPage() - 1"
                  [pageSize]="movimientosPageSize"
                  [pageSizeOptions]="[10, 20, 50]"
                  (page)="onMovimientosPage($event)"
                  showFirstLastButtons
                />
              }
            </mat-card>
            <app-dashboard-distribucion [distribucion]="distribucion()" [calculo]="calculo()" />
          </div>
        }
      }
    </section>
  `,
  styles: `
    .detail-header mat-card-content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--gb-space-4);
    }
    .detail-header__meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-header__meta strong {
      color: var(--adex-blue);
      font: var(--mat-sys-title-medium);
    }
    .detail-header__meta span {
      color: var(--adex-text-muted);
      font: var(--mat-sys-body-small);
    }
    .col-actions {
      width: 56px;
      text-align: right;
    }
  `
})
export class PuntosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);

  q = '';

  loadingEmpresas = signal(true);
  empresas = signal<Empresa[]>([]);
  empresasTotal = signal(0);
  empresasPage = signal(1);
  empresasPageSize = 20;
  empresaCols = ['ruc', 'razonSocial', 'categoria', 'activo', 'ver'];

  selectedEmpresa = signal<Empresa | null>(null);
  loadingDetalle = signal(false);
  resumen = signal<PuntosResumen | null>(null);
  movimientos = signal<PuntoMovimiento[]>([]);
  movimientosTotal = signal(0);
  movimientosPage = signal(1);
  movimientosPageSize = 20;
  movCols = ['fecha', 'tipo', 'puntos', 'estado', 'vence'];

  distribucion = computed((): DashboardDistribucion => {
    const r = this.resumen();
    if (!r) {
      return {
        vigentes: { etiqueta: 'Disponibles', cantidad: 0, porcentaje: 0, puntos: 0, costoUnitario: 0 },
        canjes: { etiqueta: 'Canjeados', cantidad: 0, porcentaje: 0, puntos: 0, costoUnitario: 0 },
        vencidas: { etiqueta: 'Vencidos / próx.', cantidad: 0, porcentaje: 0, puntos: 0, costoUnitario: 0 },
        totalOperaciones: 0
      };
    }
    return this.buildDistribucion(r);
  });

  calculo = computed((): DashboardCalculo => {
    const r = this.resumen();
    if (!r) return { puntosGenerados: 0, puntosCanjeados: 0, puntosVencidos: 0, saldoNeto: 0 };
    return {
      puntosGenerados: r.generados,
      puntosCanjeados: r.canjeados,
      puntosVencidos: r.vencidos,
      saldoNeto: r.generados - r.canjeados - r.vencidos
    };
  });

  ngOnInit(): void {
    this.loadEmpresas();
  }

  search(): void {
    this.empresasPage.set(1);
    this.loadEmpresas();
  }

  loadEmpresas(): void {
    this.loadingEmpresas.set(true);
    this.api.empresas(this.q, this.empresasPage(), this.empresasPageSize).subscribe({
      next: (r) => {
        this.empresas.set(r.items ?? []);
        this.empresasTotal.set(r.total ?? 0);
        this.loadingEmpresas.set(false);
      },
      error: (e) => {
        this.loadingEmpresas.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar empresas.'));
      }
    });
  }

  onEmpresasPage(ev: PageEvent): void {
    this.empresasPage.set(ev.pageIndex + 1);
    this.empresasPageSize = ev.pageSize;
    this.loadEmpresas();
  }

  consultar(empresa: Empresa): void {
    this.selectedEmpresa.set(empresa);
    this.movimientosPage.set(1);
    this.loadDetalle();
  }

  volver(): void {
    this.selectedEmpresa.set(null);
    this.resumen.set(null);
    this.movimientos.set([]);
    this.movimientosTotal.set(0);
  }

  loadDetalle(): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) return;
    this.loadingDetalle.set(true);
    this.api.puntosResumen(empresa.empresaId).subscribe({
      next: (r) => this.resumen.set(r),
      error: (e) => this.notify.error(apiErrorMessage(e, 'No se pudo cargar el resumen.'))
    });
    this.api.movimientos(empresa.empresaId, this.movimientosPage(), this.movimientosPageSize).subscribe({
      next: (r) => {
        this.movimientos.set(r.items ?? []);
        this.movimientosTotal.set(r.total ?? 0);
        this.loadingDetalle.set(false);
      },
      error: (e) => {
        this.loadingDetalle.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar movimientos.'));
      }
    });
  }

  onMovimientosPage(ev: PageEvent): void {
    this.movimientosPage.set(ev.pageIndex + 1);
    this.movimientosPageSize = ev.pageSize;
    this.loadDetalle();
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(n);
  }

  pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  private buildDistribucion(r: PuntosResumen): DashboardDistribucion {
    const parts = [
      { etiqueta: 'Disponibles', puntos: r.disponibles },
      { etiqueta: 'Canjeados', puntos: r.canjeados },
      { etiqueta: 'Vencidos / próx.', puntos: r.vencidos + r.proximosAVencer }
    ];
    const total = parts.reduce((s, p) => s + p.puntos, 0);
    const mk = (etiqueta: string, puntos: number) => ({
      etiqueta,
      cantidad: Math.round(puntos),
      porcentaje: total > 0 ? Math.round((puntos / total) * 1000) / 10 : 0,
      puntos,
      costoUnitario: puntos > 0 ? Math.round((puntos / Math.max(puntos, 1)) * 100) / 100 : 0
    });
    return {
      vigentes: mk(parts[0].etiqueta, parts[0].puntos),
      canjes: mk(parts[1].etiqueta, parts[1].puntos),
      vencidas: mk(parts[2].etiqueta, parts[2].puntos),
      totalOperaciones: Math.round(total)
    };
  }
}
