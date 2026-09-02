import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { DashboardCalculo, DashboardDistribucion, EmpresaDetalle, PuntosResumen } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { DashboardDistribucionComponent } from '../../shared/dashboard-distribucion.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-empresa-detalle',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    KpiCardComponent,
    DashboardDistribucionComponent,
    StatusChipComponent,
    LoadingStateComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="page">
      <a mat-button routerLink="/empresas">
        <mat-icon>arrow_back</mat-icon>
        Volver
      </a>
      @if (loading()) {
        <app-loading-state />
      } @else if (detalle(); as d) {
        <app-page-header [title]="d.empresa.razonSocial" [subtitle]="'RUC ' + d.empresa.ruc + ' · CRM ' + d.empresa.crmEmpresaId">
          <app-status-chip [status]="d.empresa.activo ? 'Activo' : 'Inactivo'" />
        </app-page-header>
        <div class="dashboard-kpi-row puntos-kpi-row">
          <app-kpi-card
            label="Disponibles"
            [value]="fmt(d.puntos.disponibles)"
            icon="account_balance_wallet"
            [subtitle]="pct(d.puntos.disponibles, d.puntos.generados) + '% del generado'"
            [progress]="pct(d.puntos.disponibles, d.puntos.generados)"
          />
          <app-kpi-card
            label="Generados"
            [value]="fmt(d.puntos.generados)"
            icon="stars"
            subtitle="Acumulación total de la empresa"
            tone="info"
          />
          <app-kpi-card
            label="Canjeados"
            [value]="fmt(d.puntos.canjeados)"
            icon="redeem"
            [subtitle]="pct(d.puntos.canjeados, d.puntos.generados) + '% utilizado'"
            [progress]="pct(d.puntos.canjeados, d.puntos.generados)"
            tone="warning"
          />
          <app-kpi-card
            label="Próx. vencer"
            [value]="fmt(d.puntos.proximosAVencer)"
            icon="schedule"
            [badge]="d.puntos.proximosAVencer > 0 ? 'Atención' : 'Al día'"
            [tone]="d.puntos.proximosAVencer > 0 ? 'danger' : 'success'"
          />
          <app-kpi-card
            label="Vencidos"
            [value]="fmt(d.puntos.vencidos)"
            icon="hourglass_disabled"
            [badge]="d.puntos.vencidos > 0 ? 'Revisar' : 'Sin vencidos'"
            tone="danger"
          />
        </div>
        <div class="dashboard-body puntos-body">
          <div class="empresa-resumen-card">
            <h2 class="section-title">Resumen de la empresa</h2>
            <p class="page__intro">
              Categoría: {{ d.empresa.categoria || '—' }} · Última sync:
              {{ d.empresa.ultimaSyncUtc | date: 'short' }}
            </p>
          </div>
          <div class="empresa-resumen-card">
            <h2 class="section-title">Datos CRM</h2>
            <dl class="crm-data-list">
              <div><dt>Teléfono</dt><dd>{{ d.empresa.telefono || '—' }}</dd></div>
              <div><dt>Correo</dt><dd>{{ d.empresa.correo || '—' }}</dd></div>
              <div><dt>Promotor</dt><dd>{{ d.empresa.promotor || '—' }}</dd></div>
              <div><dt>Ejecutivo comercial</dt><dd>{{ d.empresa.ejecutivoComercial || '—' }}</dd></div>
              <div><dt>Gerencia</dt><dd>{{ d.empresa.gerencia || '—' }}</dd></div>
              <div><dt>Comité</dt><dd>{{ d.empresa.comite || '—' }}</dd></div>
              <div><dt>Estado CRM</dt><dd>{{ d.empresa.estadoCrm || '—' }}</dd></div>
              <div><dt>Alta CRM</dt><dd>{{ d.empresa.crmCreatedOn ? (d.empresa.crmCreatedOn | date: 'short') : '—' }}</dd></div>
            </dl>
          </div>
          <app-dashboard-distribucion [distribucion]="distribucion(d.puntos)" [calculo]="calculo(d.puntos)" />
        </div>
      } @else {
        <app-empty-state message="Empresa no encontrada." icon="business" />
      }
    </section>
  `,
  styles: `
    .crm-data-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px 24px;
      margin: 0;
    }
    .crm-data-list div {
      display: grid;
      gap: 4px;
    }
    .crm-data-list dt {
      font-size: 0.78rem;
      color: var(--adex-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .crm-data-list dd {
      margin: 0;
      font: var(--mat-sys-body-medium);
    }
  `
})
export class EmpresaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);

  loading = signal(true);
  detalle = signal<EmpresaDetalle | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.empresa(id).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudo cargar la empresa.'));
      }
    });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(n);
  }

  pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  calculo(r: PuntosResumen): DashboardCalculo {
    return {
      puntosGenerados: r.generados,
      puntosCanjeados: r.canjeados,
      puntosVencidos: r.vencidos,
      saldoNeto: r.generados - r.canjeados - r.vencidos
    };
  }

  distribucion(r: PuntosResumen): DashboardDistribucion {
    const total = r.disponibles + r.canjeados + r.vencidos + r.proximosAVencer;
    const mk = (etiqueta: string, puntos: number) => ({
      etiqueta,
      cantidad: Math.round(puntos),
      porcentaje: total > 0 ? Math.round((puntos / total) * 1000) / 10 : 0,
      puntos,
      costoUnitario: puntos > 0 ? 1 : 0
    });
    return {
      vigentes: mk('Disponibles', r.disponibles),
      canjes: mk('Canjeados', r.canjeados),
      vencidas: mk('Vencidos / próx.', r.vencidos + r.proximosAVencer),
      totalOperaciones: Math.round(total)
    };
  }
}
