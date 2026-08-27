import { DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { DashboardEmpresaFila } from '../core/models';

type SortKey = keyof Pick<
  DashboardEmpresaFila,
  'alumnos' | 'nuevos' | 'contrataciones' | 'puntosGenerados' | 'vigentes' | 'vencidas' | 'canjes' | 'puntosCanjeados' | 'puntosDisponibles' | 'puntosPorCanje'
>;

@Component({
  selector: 'app-dashboard-empresa-table',
  standalone: true,
  imports: [DecimalPipe, MatCardModule, MatTableModule, MatIconModule, RouterLink],
  template: `
    <mat-card appearance="outlined" class="dash-table-card">
      <mat-card-header>
        <mat-card-title>Origen de alumnos y puntos por empresa</mat-card-title>
        <mat-card-subtitle>Desglose por empresa asociada del programa de beneficios.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="table-wrap">
          <table mat-table [dataSource]="sortedRows()">
            <ng-container matColumnDef="empresa">
              <th mat-header-cell *matHeaderCellDef>Empresa</th>
              <td mat-cell *matCellDef="let r">
                <a class="link-cell" [routerLink]="['/empresas', r.empresaId]">{{ r.empresa }}</a>
              </td>
              <td mat-footer-cell *matFooterCellDef>TOTAL</td>
            </ng-container>

            <ng-container matColumnDef="alumnos">
              <th mat-header-cell *matHeaderCellDef>
                <button type="button" class="th-sort" (click)="toggleSort('alumnos')">
                  Alumnos <mat-icon>{{ sortIcon('alumnos') }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let r">{{ r.alumnos }}</td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().alumnos }}</td>
            </ng-container>

            <ng-container matColumnDef="nuevos">
              <th mat-header-cell *matHeaderCellDef>
                <button type="button" class="th-sort" (click)="toggleSort('nuevos')">
                  Nuevos <mat-icon>{{ sortIcon('nuevos') }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let r">{{ r.nuevos }}</td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().nuevos }}</td>
            </ng-container>

            <ng-container matColumnDef="contrataciones">
              <th mat-header-cell *matHeaderCellDef>
                <button type="button" class="th-sort" (click)="toggleSort('contrataciones')">
                  Contrat. <mat-icon>{{ sortIcon('contrataciones') }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let r">{{ r.contrataciones }}</td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().contrataciones }}</td>
            </ng-container>

            <ng-container matColumnDef="puntosGenerados">
              <th mat-header-cell *matHeaderCellDef>
                <button type="button" class="th-sort" (click)="toggleSort('puntosGenerados')">
                  Puntos gen. <mat-icon>{{ sortIcon('puntosGenerados') }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let r">{{ r.puntosGenerados | number:'1.0-0' }}</td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().puntosGenerados | number:'1.0-0' }}</td>
            </ng-container>

            <ng-container matColumnDef="vigentes">
              <th mat-header-cell *matHeaderCellDef>Vigentes</th>
              <td mat-cell *matCellDef="let r">
                <span class="bar-cell">
                  <span class="bar-cell__value">{{ r.vigentes }}</span>
                  <span class="mini-bar mini-bar--vigentes" [style.width.%]="barPct(r.vigentes, maxVigentes())"></span>
                </span>
              </td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().vigentes }}</td>
            </ng-container>

            <ng-container matColumnDef="vencidas">
              <th mat-header-cell *matHeaderCellDef>Vencidas</th>
              <td mat-cell *matCellDef="let r">
                <span class="bar-cell">
                  <span class="bar-cell__value">{{ r.vencidas }}</span>
                  <span class="mini-bar mini-bar--vencidas" [style.width.%]="barPct(r.vencidas, maxVencidas())"></span>
                </span>
              </td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().vencidas }}</td>
            </ng-container>

            <ng-container matColumnDef="canjes">
              <th mat-header-cell *matHeaderCellDef>
                <button type="button" class="th-sort" (click)="toggleSort('canjes')">
                  Canjes <mat-icon>{{ sortIcon('canjes') }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let r">
                <span class="bar-cell">
                  <span class="bar-cell__value">{{ r.canjes }}</span>
                  <span class="mini-bar mini-bar--canjes" [style.width.%]="barPct(r.canjes, maxCanjes())"></span>
                </span>
              </td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().canjes }}</td>
            </ng-container>

            <ng-container matColumnDef="puntosCanjeados">
              <th mat-header-cell *matHeaderCellDef>Canjeados</th>
              <td mat-cell *matCellDef="let r">{{ r.puntosCanjeados | number:'1.0-0' }}</td>
              <td mat-footer-cell *matFooterCellDef>{{ totals().puntosCanjeados | number:'1.0-0' }}</td>
            </ng-container>

            <ng-container matColumnDef="puntosPorCanje">
              <th mat-header-cell *matHeaderCellDef>Pts / canje</th>
              <td mat-cell *matCellDef="let r">{{ r.puntosPorCanje | number:'1.0-2' }}</td>
              <td mat-footer-cell *matFooterCellDef>{{ avgPuntosPorCanje() | number:'1.0-2' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
            <tr mat-footer-row *matFooterRowDef="cols"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .dash-table-card mat-card-header { padding-bottom: var(--gb-space-3); }
    mat-card-title { font: var(--mat-sys-title-medium); color: var(--adex-blue); }
    mat-card-subtitle { font: var(--mat-sys-body-small); }
    .th-sort {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      padding: 0;
    }
    .th-sort mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      opacity: 0.8;
    }
    .bar-cell {
      display: grid;
      grid-template-columns: 28px 1fr;
      align-items: center;
      gap: var(--gb-space-2);
      min-width: 88px;
    }
    .bar-cell__value { text-align: right; font-variant-numeric: tabular-nums; }
    .mini-bar {
      display: block;
      height: 6px;
      border-radius: 999px;
      max-width: 72px;
    }
    .mini-bar--vigentes { background: var(--adex-blue); }
    .mini-bar--canjes { background: var(--adex-info); }
    .mini-bar--vencidas { background: var(--adex-warning); }
    .mat-mdc-footer-row .mat-mdc-footer-cell {
      font-weight: 600;
      color: var(--adex-blue);
      border-top: 2px solid var(--adex-border);
    }
  `
})
export class DashboardEmpresaTableComponent {
  rows = input.required<DashboardEmpresaFila[]>();

  readonly cols = [
    'empresa',
    'alumnos',
    'nuevos',
    'contrataciones',
    'puntosGenerados',
    'vigentes',
    'vencidas',
    'canjes',
    'puntosCanjeados',
    'puntosPorCanje'
  ];

  sortKey = signal<SortKey>('contrataciones');
  sortDir = signal<'asc' | 'desc'>('desc');

  sortedRows = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    return [...this.rows()].sort((a, b) => {
      const av = a[key] as number;
      const bv = b[key] as number;
      return dir === 'asc' ? av - bv : bv - av;
    });
  });

  totals = computed(() =>
    this.rows().reduce(
      (acc, r) => ({
        alumnos: acc.alumnos + r.alumnos,
        nuevos: acc.nuevos + r.nuevos,
        contrataciones: acc.contrataciones + r.contrataciones,
        puntosGenerados: acc.puntosGenerados + r.puntosGenerados,
        vigentes: acc.vigentes + r.vigentes,
        vencidas: acc.vencidas + r.vencidas,
        canjes: acc.canjes + r.canjes,
        puntosCanjeados: acc.puntosCanjeados + r.puntosCanjeados
      }),
      {
        alumnos: 0,
        nuevos: 0,
        contrataciones: 0,
        puntosGenerados: 0,
        vigentes: 0,
        vencidas: 0,
        canjes: 0,
        puntosCanjeados: 0
      }
    )
  );

  maxVigentes = computed(() => Math.max(1, ...this.rows().map((r) => r.vigentes)));
  maxVencidas = computed(() => Math.max(1, ...this.rows().map((r) => r.vencidas)));
  maxCanjes = computed(() => Math.max(1, ...this.rows().map((r) => r.canjes)));

  avgPuntosPorCanje = computed(() => {
    const t = this.totals();
    return t.canjes > 0 ? t.puntosCanjeados / t.canjes : 0;
  });

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc');
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  barPct(value: number, max: number): number {
    return Math.max(8, Math.round((value / max) * 100));
  }
}
