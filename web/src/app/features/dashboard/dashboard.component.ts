import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { apiErrorMessage } from '../../core/http-error';
import { DashboardOverview } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { canWriteOperacion, hasAnyRole } from '../../core/app-role';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
    LoadingStateComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="exec">
      @if (loading()) {
        <app-loading-state />
      } @else if (error()) {
        <app-empty-state [message]="error()" icon="error_outline" />
      } @else if (data(); as d) {
        <header class="exec-hero">
          <div>
            <h1>¡Bienvenido, {{ firstName() }}!</h1>
            <p>Resumen ejecutivo de la plataforma ADEX</p>
          </div>
          <div class="exec-hero__actions">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="exec-filter">
              <mat-label>Categoría</mat-label>
              <mat-select [(ngModel)]="filtroCategoria">
                <mat-option value="todos">Todos los gremios</mat-option>
                <mat-option value="local">Vista local</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="exec-filter">
              <mat-label>Periodo</mat-label>
              <mat-select [(ngModel)]="filtroPeriodo">
                <mat-option value="actual">Periodo actual</mat-option>
                <mat-option value="30d">Últimos 30 días</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-stroked-button type="button" disabled>
              <mat-icon>download</mat-icon>
              Exportar
            </button>
          </div>
        </header>

        <div class="exec-kpis">
          @for (kpi of execKpis(); track kpi.label) {
            <article class="exec-kpi">
              <div class="exec-kpi__head">
                <span class="exec-kpi__icon" [class]="'tone-' + kpi.tone">
                  <mat-icon>{{ kpi.icon }}</mat-icon>
                </span>
                <span class="exec-kpi__label">{{ kpi.label }}</span>
              </div>
              <div class="exec-kpi__value">{{ kpi.value }}</div>
              <div class="exec-kpi__trend" [class.up]="kpi.delta >= 0" [class.down]="kpi.delta < 0">
                {{ kpi.delta >= 0 ? '+' : '' }}{{ kpi.delta }}%
                <span>{{ kpi.hint }}</span>
              </div>
              <div class="exec-kpi__spark" aria-hidden="true">
                <svg viewBox="0 0 80 24" preserveAspectRatio="none">
                  <polyline [attr.points]="kpi.spark" fill="none" stroke="currentColor" stroke-width="2" />
                </svg>
              </div>
            </article>
          }
        </div>

        <div class="exec-zones">
          <section class="zone zone--ingresos">
            <header class="zone__head">
              <span class="zone__badge zone__badge--green"><mat-icon>add_circle</mat-icon></span>
              <div>
                <h2>Ingresos</h2>
                <p>Registro rápido de información</p>
              </div>
            </header>
            <div class="action-list">
              @for (a of ingresos(); track a.path) {
                <a class="action-row" [routerLink]="a.path">
                  <span class="action-row__icon"><mat-icon>{{ a.icon }}</mat-icon></span>
                  <span class="action-row__text">
                    <strong>{{ a.title }}</strong>
                    <small>{{ a.desc }}</small>
                  </span>
                  <mat-icon class="action-row__chevron">chevron_right</mat-icon>
                </a>
              }
            </div>
          </section>

          <section class="zone zone--procesos">
            <header class="zone__head">
              <span class="zone__badge zone__badge--blue"><mat-icon>settings</mat-icon></span>
              <div>
                <h2>Procesos</h2>
                <p>Flujos y operaciones que requieren seguimiento</p>
              </div>
            </header>
            <div class="process-grid">
              @for (p of procesos(); track p.label) {
                <a class="process-card" [routerLink]="p.path" [class]="'process-card--' + p.tone">
                  <mat-icon>{{ p.icon }}</mat-icon>
                  <strong>{{ p.value }}</strong>
                  <span>{{ p.label }}</span>
                </a>
              }
            </div>
            <a class="zone__link" routerLink="/contrataciones">Ver todos los procesos →</a>
          </section>

          <section class="zone zone--reportes">
            <header class="zone__head">
              <span class="zone__badge zone__badge--purple"><mat-icon>bar_chart</mat-icon></span>
              <div>
                <h2>Reportes y consultas</h2>
                <p>Información para análisis y toma de decisiones</p>
              </div>
            </header>

            <mat-tab-group animationDuration="0" class="report-tabs">
              <mat-tab label="Resumen">
                <div class="report-panel">
                  <div class="mini-charts">
                    <div class="mini-chart">
                      <h3>Empresas asociadas</h3>
                      <svg viewBox="0 0 160 64" class="line-chart" aria-hidden="true">
                        <polyline [attr.points]="linePoints()" fill="none" stroke="var(--adex-blue)" stroke-width="2.5" />
                      </svg>
                      <div class="mini-chart__value">{{ fmt(d.kpis.empresasActivas) }}</div>
                    </div>
                    <div class="mini-chart">
                      <h3>Contrataciones</h3>
                      <div class="bar-chart" aria-hidden="true">
                        @for (b of barHeights(); track $index) {
                          <span [style.height.%]="b"></span>
                        }
                      </div>
                      <div class="mini-chart__value">{{ fmt(d.kpis.contratacionesVigentes) }}</div>
                    </div>
                  </div>

                  <div class="donut-block">
                    <h3>Distribución operativa</h3>
                    <div class="donut-row">
                      <div class="donut-wrap">
                        <svg viewBox="0 0 42 42" class="donut">
                          @for (seg of donutSegments(); track seg.label) {
                            <circle
                              [attr.class]="seg.className"
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
                          <strong>{{ d.distribucion.totalOperaciones }}</strong>
                          <small>ops</small>
                        </div>
                      </div>
                      <ul class="legend">
                        <li><i class="dot dot--blue"></i> Vigentes {{ d.distribucion.vigentes.porcentaje }}%</li>
                        <li><i class="dot dot--info"></i> Canjes {{ d.distribucion.canjes.porcentaje }}%</li>
                        <li><i class="dot dot--warn"></i> Vencidas {{ d.distribucion.vencidas.porcentaje }}%</li>
                      </ul>
                    </div>
                  </div>

                  <div class="quick-links">
                    <a routerLink="/empresas"><mat-icon>description</mat-icon> Reporte de empresas</a>
                    <a routerLink="/contrataciones"><mat-icon>description</mat-icon> Reporte de contrataciones</a>
                    <a routerLink="/beneficios"><mat-icon>description</mat-icon> Reporte de beneficios</a>
                    <a routerLink="/canjes"><mat-icon>description</mat-icon> Reporte de canjes</a>
                    <a routerLink="/alumnos"><mat-icon>description</mat-icon> Reporte de alumnos</a>
                  </div>
                </div>
              </mat-tab>
              <mat-tab label="Empresas">
                <div class="report-panel report-panel--simple">
                  <p>{{ fmt(d.kpis.empresasActivas) }} empresas activas en el catálogo local.</p>
                  <a mat-stroked-button routerLink="/empresas">Ir a empresas</a>
                </div>
              </mat-tab>
              <mat-tab label="Contrataciones">
                <div class="report-panel report-panel--simple">
                  <p>{{ fmt(d.kpis.contratacionesVigentes) }} vigentes · {{ fmt(d.kpis.contratacionesVencidas) }} vencidas.</p>
                  <a mat-stroked-button routerLink="/contrataciones">Ir a contrataciones</a>
                </div>
              </mat-tab>
              <mat-tab label="Beneficios">
                <div class="report-panel report-panel--simple">
                  <p>{{ fmt(d.kpis.beneficiosDisponibles) }} beneficios disponibles.</p>
                  <a mat-stroked-button routerLink="/beneficios">Ir a beneficios</a>
                </div>
              </mat-tab>
              <mat-tab label="Canjes">
                <div class="report-panel report-panel--simple">
                  <p>{{ fmt(d.kpis.canjesRealizados) }} canjes realizados.</p>
                  <a mat-stroked-button routerLink="/canjes">Ir a canjes</a>
                </div>
              </mat-tab>
            </mat-tab-group>

            <a class="zone__link" routerLink="/puntos">Ver todos los reportes →</a>
          </section>
        </div>

        <div class="exec-recent">
          <section class="recent-card">
            <h2>Últimas empresas asociadas</h2>
            @if (recentEmpresas().length === 0) {
              <p class="muted">Sin empresas en el periodo.</p>
            } @else {
              <ul>
                @for (e of recentEmpresas(); track e.empresaId) {
                  <li>
                    <a [routerLink]="['/empresas', e.empresaId]">{{ e.empresa }}</a>
                    <span>{{ e.contrataciones }} contrat.</span>
                  </li>
                }
              </ul>
            }
          </section>
          <section class="recent-card">
            <h2>Contrataciones recientes</h2>
            <ul>
              <li>
                <span>Vigentes</span>
                <strong>{{ fmt(d.kpis.contratacionesVigentes) }}</strong>
              </li>
              <li>
                <span>Vencidas</span>
                <strong>{{ fmt(d.kpis.contratacionesVencidas) }}</strong>
              </li>
              <li>
                <span>Puntos generados</span>
                <strong>{{ fmt(d.kpis.puntosGenerados) }}</strong>
              </li>
            </ul>
          </section>
          <section class="recent-card">
            <h2>Próximos eventos / fechas clave</h2>
            <ul class="events">
              <li>
                <span class="event-date">30d</span>
                <span>Puntos próximos a vencer: {{ fmt(d.kpis.puntosProximosAVencer) }}</span>
              </li>
              <li>
                <span class="event-date">Hoy</span>
                <span>Saldo disponible: {{ fmt(d.kpis.puntosDisponibles) }} pts</span>
              </li>
              <li>
                <span class="event-date">Ops</span>
                <span>Canjes acumulados: {{ fmt(d.kpis.canjesRealizados) }}</span>
              </li>
            </ul>
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    .exec { display: flex; flex-direction: column; gap: var(--gb-space-5); width: 100%; max-width: 100%; }
    .exec-hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--gb-space-4);
      flex-wrap: wrap;
    }
    .exec-hero h1 {
      margin: 0;
      font: var(--mat-sys-headline-small);
      color: var(--adex-blue);
      font-weight: 700;
    }
    .exec-hero p { margin: 4px 0 0; color: var(--adex-text-muted); }
    .exec-hero__actions { display: flex; flex-wrap: wrap; gap: var(--gb-space-3); align-items: center; }
    .exec-filter { width: 180px; margin: 0; }

    .exec-kpis {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: var(--gb-space-4);
    }
    .exec-kpi {
      background: var(--adex-white);
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      padding: var(--gb-space-4);
      box-shadow: 0 1px 2px rgb(0 59 112 / 5%);
    }
    .exec-kpi__head { display: flex; align-items: center; gap: var(--gb-space-2); margin-bottom: var(--gb-space-2); }
    .exec-kpi__icon {
      width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center;
      background: var(--adex-blue-soft); color: var(--adex-blue);
    }
    .exec-kpi__icon mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .exec-kpi__icon.tone-success { background: var(--adex-success-container); color: var(--adex-success); }
    .exec-kpi__icon.tone-info { background: var(--adex-info-container); color: var(--adex-info); }
    .exec-kpi__icon.tone-warning { background: var(--adex-warning-container); color: var(--adex-warning); }
    .exec-kpi__label { font: var(--mat-sys-label-medium); color: var(--adex-text-muted); }
    .exec-kpi__value { font: var(--mat-sys-headline-small); font-weight: 700; color: var(--adex-blue); }
    .exec-kpi__trend { margin-top: 4px; font: var(--mat-sys-body-small); display: flex; gap: 6px; align-items: baseline; }
    .exec-kpi__trend.up { color: var(--adex-success); font-weight: 600; }
    .exec-kpi__trend.down { color: var(--adex-error); font-weight: 600; }
    .exec-kpi__trend span { color: var(--adex-text-muted); font-weight: 400; }
    .exec-kpi__spark { margin-top: var(--gb-space-2); height: 24px; color: var(--adex-info); opacity: 0.75; }
    .exec-kpi__spark svg { width: 100%; height: 100%; }

    .exec-zones {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--gb-space-4);
      align-items: start;
    }
    .zone {
      background: var(--adex-white);
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      padding: var(--gb-space-4);
      box-shadow: 0 1px 2px rgb(0 59 112 / 5%);
      min-height: 420px;
      display: flex;
      flex-direction: column;
    }
    .zone__head { display: flex; gap: var(--gb-space-3); align-items: flex-start; margin-bottom: var(--gb-space-4); }
    .zone__head h2 { margin: 0; font: var(--mat-sys-title-medium); color: var(--adex-blue); text-transform: uppercase; letter-spacing: 0.03em; }
    .zone__head p { margin: 2px 0 0; color: var(--adex-text-muted); font: var(--mat-sys-body-small); }
    .zone__badge {
      width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0;
    }
    .zone__badge mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .zone__badge--green { background: var(--adex-success-container); color: var(--adex-success); }
    .zone__badge--blue { background: var(--adex-info-container); color: var(--adex-info); }
    .zone__badge--purple { background: #ede7f6; color: #5e35b1; }
    .zone__link {
      margin-top: auto;
      padding-top: var(--gb-space-3);
      color: var(--adex-blue);
      text-decoration: none;
      font: var(--mat-sys-label-large);
      font-weight: 600;
    }

    .action-list { display: flex; flex-direction: column; gap: var(--gb-space-2); }
    .action-row {
      display: flex; align-items: center; gap: var(--gb-space-3);
      padding: var(--gb-space-3);
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      text-decoration: none;
      color: inherit;
      transition: background 0.15s ease;
    }
    .action-row:hover { background: var(--adex-blue-soft); }
    .action-row__icon {
      width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center;
      background: var(--adex-success-container); color: var(--adex-success);
    }
    .action-row__text { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .action-row__text strong { font: var(--mat-sys-title-small); color: var(--adex-text); }
    .action-row__text small { color: var(--adex-text-muted); }
    .action-row__chevron { color: var(--adex-text-muted); }

    .process-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--gb-space-3);
      margin-bottom: var(--gb-space-3);
    }
    .process-card {
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      padding: var(--gb-space-3);
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 96px;
    }
    .process-card mat-icon { color: var(--adex-info); }
    .process-card strong { font: var(--mat-sys-headline-small); color: var(--adex-blue); }
    .process-card span { font: var(--mat-sys-body-small); color: var(--adex-text-muted); }
    .process-card--warning mat-icon { color: var(--adex-warning); }
    .process-card--danger mat-icon { color: var(--adex-error); }
    .process-card--success mat-icon { color: var(--adex-success); }

    .report-tabs { flex: 1; }
    .report-panel { padding-top: var(--gb-space-3); display: flex; flex-direction: column; gap: var(--gb-space-4); }
    .report-panel--simple { gap: var(--gb-space-3); }
    .mini-charts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gb-space-3); }
    .mini-chart h3, .donut-block h3 { margin: 0 0 8px; font: var(--mat-sys-label-large); color: var(--adex-text-muted); }
    .mini-chart__value { margin-top: 6px; font-weight: 700; color: var(--adex-blue); }
    .line-chart { width: 100%; height: 64px; background: var(--adex-blue-soft); border-radius: 8px; }
    .bar-chart {
      height: 64px; display: flex; align-items: flex-end; gap: 4px;
      background: var(--adex-blue-soft); border-radius: 8px; padding: 8px;
    }
    .bar-chart span { flex: 1; background: var(--adex-blue); border-radius: 3px 3px 0 0; min-height: 8%; }
    .donut-row { display: flex; gap: var(--gb-space-3); align-items: center; }
    .donut-wrap { position: relative; width: 96px; height: 96px; flex-shrink: 0; }
    .donut { width: 100%; height: 100%; transform: rotate(-90deg); }
    .donut circle { stroke-linecap: butt; }
    .seg-vigentes { stroke: var(--adex-blue); }
    .seg-canjes { stroke: var(--adex-info); }
    .seg-vencidas { stroke: var(--adex-warning); }
    .donut__center {
      position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.1;
    }
    .donut__center strong { color: var(--adex-blue); font-size: 1.1rem; }
    .donut__center small { color: var(--adex-text-muted); font-size: 11px; }
    .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font: var(--mat-sys-body-small); }
    .legend .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .dot--blue { background: var(--adex-blue); }
    .dot--info { background: var(--adex-info); }
    .dot--warn { background: var(--adex-warning); }
    .quick-links { display: flex; flex-direction: column; gap: 6px; }
    .quick-links a {
      display: inline-flex; align-items: center; gap: 8px;
      color: var(--adex-blue); text-decoration: none; font: var(--mat-sys-body-small); font-weight: 500;
    }
    .quick-links mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .exec-recent {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--gb-space-4);
    }
    .recent-card {
      background: var(--adex-white);
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      padding: var(--gb-space-4);
    }
    .recent-card h2 { margin: 0 0 var(--gb-space-3); font: var(--mat-sys-title-small); color: var(--adex-blue); }
    .recent-card ul { list-style: none; margin: 0; padding: 0; }
    .recent-card li {
      display: flex; justify-content: space-between; gap: var(--gb-space-3);
      padding: 10px 0; border-bottom: 1px solid var(--adex-border);
      font: var(--mat-sys-body-medium);
    }
    .recent-card li:last-child { border-bottom: 0; }
    .recent-card a { color: var(--adex-text); text-decoration: none; font-weight: 500; }
    .recent-card a:hover { color: var(--adex-blue); }
    .recent-card li span:last-child, .recent-card li strong { color: var(--adex-text-muted); white-space: nowrap; }
    .events li { align-items: center; justify-content: flex-start; }
    .event-date {
      min-width: 44px; padding: 4px 6px; border-radius: 6px;
      background: #ede7f6; color: #5e35b1; font: var(--mat-sys-label-small); font-weight: 700; text-align: center;
    }
    .muted { color: var(--adex-text-muted); }

    @media (max-width: 1280px) {
      .exec-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .exec-zones, .exec-recent { grid-template-columns: 1fr; }
      .zone { min-height: 0; }
    }
    @media (max-width: 720px) {
      .exec-kpis, .process-grid, .mini-charts { grid-template-columns: 1fr; }
      .exec-filter { width: 100%; }
    }
  `
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);

  loading = signal(true);
  error = signal('');
  data = signal<DashboardOverview | null>(null);
  filtroCategoria = 'todos';
  filtroPeriodo = 'actual';

  firstName = computed(() => {
    const name = (this.auth.userName() || 'usuario').trim();
    return name.split(/\s+/)[0] || 'usuario';
  });

  execKpis = computed(() => {
    const d = this.data();
    if (!d) return [];
    const k = d.kpis;
    return [
      { label: 'Empresas asociadas', value: this.fmt(k.empresasActivas), icon: 'business', delta: 4.2, hint: 'vs periodo ant.', tone: 'info', spark: '0,18 16,14 32,16 48,10 64,12 80,6' },
      { label: 'Alumnos activos', value: this.fmt(k.alumnosContratados), icon: 'school', delta: 6.1, hint: 'vs periodo ant.', tone: 'info', spark: '0,20 16,16 32,18 48,12 64,8 80,10' },
      { label: 'Contrataciones', value: this.fmt(k.contratacionesVigentes), icon: 'work', delta: 8.7, hint: 'vigentes', tone: 'success', spark: '0,22 16,18 32,14 48,12 64,8 80,4' },
      { label: 'Beneficios', value: this.fmt(k.beneficiosDisponibles), icon: 'card_giftcard', delta: 3.5, hint: 'disponibles', tone: 'warning', spark: '0,12 16,14 32,10 48,16 64,12 80,8' },
      { label: 'Canjes realizados', value: this.fmt(k.canjesRealizados), icon: 'redeem', delta: 2.3, hint: 'acumulados', tone: 'success', spark: '0,16 16,14 32,15 48,11 64,13 80,9' }
    ];
  });

  ingresos = computed(() => {
    const items = [
      { path: '/empresas', icon: 'business', title: 'Registrar empresa', desc: 'Sincronizar empresa asociada', roles: ['Administrador', 'Operador'] as const },
      { path: '/alumnos', icon: 'school', title: 'Registrar alumno', desc: 'Nuevo alumno del catálogo', roles: ['Administrador', 'Operador'] as const },
      { path: '/contrataciones', icon: 'work', title: 'Registrar contratación', desc: 'Nueva contratación vigente', roles: ['Administrador', 'Operador'] as const },
      { path: '/cargas', icon: 'upload_file', title: 'Carga masiva', desc: 'Importar plantilla Excel', roles: ['Administrador', 'Operador'] as const },
      { path: '/comunicaciones', icon: 'mail', title: 'Comunicación', desc: 'Plantillas y envíos', roles: ['Administrador'] as const }
    ];
    const role = this.auth.role();
    return items.filter((i) => hasAnyRole(role, i.roles));
  });

  procesos = computed(() => {
    const d = this.data();
    if (!d) return [];
    const k = d.kpis;
    return [
      { label: 'Empresas activas', value: this.fmt(k.empresasActivas), icon: 'business', path: '/empresas', tone: 'info' },
      { label: 'Alumnos contratados', value: this.fmt(k.alumnosContratados), icon: 'school', path: '/alumnos', tone: 'info' },
      { label: 'Contrataciones activas', value: this.fmt(k.contratacionesVigentes), icon: 'work', path: '/contrataciones', tone: 'success' },
      { label: 'Canjes realizados', value: this.fmt(k.canjesRealizados), icon: 'redeem', path: '/canjes', tone: 'warning' },
      { label: 'Beneficios por vencer', value: this.fmt(k.puntosProximosAVencer), icon: 'schedule', path: '/puntos', tone: k.puntosProximosAVencer > 0 ? 'danger' : 'success' }
    ];
  });

  recentEmpresas = computed(() => (this.data()?.filasEmpresa ?? []).slice(0, 5));

  canWrite = computed(() => canWriteOperacion(this.auth.role()));

  ngOnInit(): void {
    this.api.dashboardOverview().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        const msg = apiErrorMessage(e, 'No se pudieron cargar los KPIs.');
        this.error.set(msg);
        this.notify.error(msg);
      }
    });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(n);
  }

  linePoints(): string {
    const n = this.data()?.kpis.empresasActivas ?? 1;
    const base = Math.max(8, 40 - Math.min(30, n * 2));
    return `0,${base + 10} 32,${base + 4} 64,${base + 8} 96,${base} 128,${base + 6} 160,${Math.max(6, base - 4)}`;
  }

  barHeights(): number[] {
    const v = this.data()?.kpis.contratacionesVigentes ?? 1;
    return [35, 48, 42, 60, 55, Math.min(95, 40 + v * 5), 70];
  }

  donutSegments() {
    const dist = this.data()?.distribucion;
    if (!dist) return [];
    const total = Math.max(1, dist.totalOperaciones);
    const parts = [
      { label: 'vigentes', value: dist.vigentes.cantidad, className: 'seg-vigentes' },
      { label: 'canjes', value: dist.canjes.cantidad, className: 'seg-canjes' },
      { label: 'vencidas', value: dist.vencidas.cantidad, className: 'seg-vencidas' }
    ];
    let offset = 25;
    return parts.map((p) => {
      const pct = p.value / total;
      const seg = { ...p, dash: `${pct * 100} ${100}`, offset: `${offset}` };
      offset -= pct * 100;
      return seg;
    });
  }
}
