import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DashboardCalculo, DashboardDistribucion } from '../core/models';

@Component({
  selector: 'app-dashboard-distribucion',
  standalone: true,
  imports: [MatCardModule, DecimalPipe],
  template: `
    <mat-card appearance="outlined" class="dash-dist">
      <mat-card-header>
        <mat-card-title>Distribución y saldo por estado</mat-card-title>
        <mat-card-subtitle>Contrataciones vigentes, canjes y vencidas.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="dash-dist__items">
          @for (item of items(); track item.etiqueta) {
            <div class="dist-item" [class]="item.className">
              <div class="dist-item__head">
                <span class="dist-item__label">{{ item.etiqueta }}</span>
                <span class="dist-item__count">{{ item.cantidad }}</span>
              </div>
              <div class="dist-item__meta">
                <span>{{ item.porcentaje | number:'1.0-1' }}% del total</span>
                <span [class.positive]="item.puntos >= 0" [class.negative]="item.puntos < 0">
                  {{ item.puntos >= 0 ? '+' : '' }}{{ item.puntos | number:'1.0-0' }} pts
                </span>
              </div>
              <div class="dist-item__unit">{{ item.costoUnitario | number:'1.0-2' }} pts por operación</div>
            </div>
          }
        </div>

        <div class="dash-dist__bottom">
          <div class="donut-wrap" [attr.aria-label]="'Distribución: ' + distribucion().totalOperaciones + ' operaciones'">
            <svg viewBox="0 0 42 42" class="donut" role="img">
              @for (seg of segments(); track seg.label) {
                <circle
                  class="donut__segment"
                  [class]="seg.className"
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke-width="4"
                  [attr.stroke-dasharray]="seg.dash"
                  [attr.stroke-dashoffset]="seg.offset"
                />
              }
            </svg>
            <div class="donut__center">
              <strong>{{ distribucion().totalOperaciones }}</strong>
              <small>operaciones</small>
            </div>
          </div>

          <div class="calc-box">
            <div class="calc-box__title">Cálculo de saldo neto</div>
            <div class="calc-line">+ Puntos generados <strong>{{ calculo().puntosGenerados | number:'1.0-0' }}</strong></div>
            <div class="calc-line">− Puntos canjeados <strong>{{ calculo().puntosCanjeados | number:'1.0-0' }}</strong></div>
            <div class="calc-line">− Puntos vencidos <strong>{{ calculo().puntosVencidos | number:'1.0-0' }}</strong></div>
            <div class="calc-line calc-line--result">
              = Saldo neto <strong>{{ calculo().saldoNeto | number:'1.0-0' }}</strong>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .dash-dist mat-card-header { padding-bottom: var(--gb-space-3); }
    mat-card-title { font: var(--mat-sys-title-medium); color: var(--adex-blue); }
    mat-card-subtitle { font: var(--mat-sys-body-small); }
    .dash-dist__items { display: flex; flex-direction: column; gap: var(--gb-space-3); }
    .dist-item {
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      padding: var(--gb-space-3);
      border-left-width: 4px;
    }
    .dist-item--vigentes { border-left-color: var(--adex-blue); }
    .dist-item--canjes { border-left-color: var(--adex-info); }
    .dist-item--vencidas { border-left-color: var(--adex-warning); }
    .dist-item__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--gb-space-2);
    }
    .dist-item__label { font-weight: 600; color: var(--adex-text); }
    .dist-item__count {
      font: var(--mat-sys-title-medium);
      color: var(--adex-blue);
      font-weight: 600;
    }
    .dist-item--canjes .dist-item__count { color: var(--adex-info); }
    .dist-item--vencidas .dist-item__count { color: var(--adex-warning); }
    .dist-item__meta {
      display: flex;
      justify-content: space-between;
      gap: var(--gb-space-2);
      margin-top: var(--gb-space-1);
      font: var(--mat-sys-body-small);
      color: var(--adex-text-muted);
    }
    .positive { color: var(--adex-success); font-weight: 600; }
    .negative { color: var(--adex-red); font-weight: 600; }
    .dist-item__unit {
      margin-top: 2px;
      font: var(--mat-sys-body-small);
      color: var(--adex-text-muted);
    }
    .dash-dist__bottom {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: var(--gb-space-4);
      align-items: center;
      margin-top: var(--gb-space-5);
    }
    .donut-wrap {
      position: relative;
      width: 140px;
      height: 140px;
    }
    .donut {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .donut__segment { stroke-linecap: butt; }
    .donut__segment--vigentes { stroke: var(--adex-blue); }
    .donut__segment--canjes { stroke: var(--adex-info); }
    .donut__segment--vencidas { stroke: var(--adex-warning); }
    .donut__center {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      text-align: center;
      line-height: 1.2;
    }
    .donut__center strong {
      font: var(--mat-sys-title-large);
      color: var(--adex-blue);
    }
    .donut__center small {
      font: var(--mat-sys-body-small);
      color: var(--adex-text-muted);
    }
    .calc-box {
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      padding: var(--gb-space-3);
      background: var(--adex-blue-soft);
    }
    .calc-box__title {
      font: var(--mat-sys-label-large);
      color: var(--adex-blue);
      margin-bottom: var(--gb-space-2);
    }
    .calc-line {
      display: flex;
      justify-content: space-between;
      gap: var(--gb-space-3);
      font: var(--mat-sys-body-small);
      color: var(--adex-text);
      padding: 2px 0;
    }
    .calc-line strong { font-variant-numeric: tabular-nums; }
    .calc-line--result {
      margin-top: var(--gb-space-2);
      padding-top: var(--gb-space-2);
      border-top: 1px solid var(--adex-border);
      font-weight: 600;
      color: var(--adex-success);
    }
    @media (max-width: 520px) {
      .dash-dist__bottom { grid-template-columns: 1fr; justify-items: center; }
    }
  `
})
export class DashboardDistribucionComponent {
  distribucion = input.required<DashboardDistribucion>();
  calculo = input.required<DashboardCalculo>();

  items = computed(() => {
    const d = this.distribucion();
    return [
      { ...d.vigentes, className: 'dist-item--vigentes' },
      { ...d.canjes, className: 'dist-item--canjes' },
      { ...d.vencidas, className: 'dist-item--vencidas' }
    ];
  });

  segments = computed(() => {
    const d = this.distribucion();
    const total = Math.max(1, d.totalOperaciones);
    const parts = [
      { label: 'vigentes', value: d.vigentes.cantidad, className: 'donut__segment--vigentes' },
      { label: 'canjes', value: d.canjes.cantidad, className: 'donut__segment--canjes' },
      { label: 'vencidas', value: d.vencidas.cantidad, className: 'donut__segment--vencidas' }
    ];
    const circumference = 100;
    let offset = 25;
    return parts.map((p) => {
      const pct = p.value / total;
      const dash = `${pct * circumference} ${circumference}`;
      const seg = { ...p, dash, offset: `${offset}` };
      offset -= pct * circumference;
      return seg;
    });
  });
}
