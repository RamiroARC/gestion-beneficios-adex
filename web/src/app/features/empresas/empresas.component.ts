import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { Empresa, EmpresaSyncEstado, EmpresaSyncPreviewItem } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { RoleIfDirective } from '../../shared/role-if.directive';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatCardModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    PageHeaderComponent,
    StatusChipComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    RoleIfDirective
  ],
  template: `
    <section class="page">
      <app-page-header title="Empresas asociadas" subtitle="Fuente: CRM de Gremios (sincronización local). Sin alta manual." />

      <ng-container *appRoleIf="['Administrador', 'Operador']">
        <mat-card appearance="outlined" class="sync-card">
          <mat-card-content>
            <div class="sync-toolbar">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Inicio</mat-label>
                <input matInput type="datetime-local" [(ngModel)]="syncInicio" step="1" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Fin</mat-label>
                <input matInput type="datetime-local" [(ngModel)]="syncFin" step="1" />
              </mat-form-field>
              <button mat-flat-button type="button" (click)="verRegistros()" [disabled]="previewLoading()">
                Ver registros
              </button>
              <button
                mat-stroked-button
                type="button"
                (click)="procesar()"
                [disabled]="!canProcesar() || processLoading()"
              >
                Procesar
              </button>
            </div>

            <div class="sync-meta">
              <div class="sync-meta__text">
                <div>
                  Último periodo sincronizado:
                  @if (syncEstado()?.ultimoInicio && syncEstado()?.ultimoFin) {
                    {{ syncEstado()!.ultimoInicio | date: 'dd/MM/yyyy, hh:mm:ss a' }}
                    →
                    {{ syncEstado()!.ultimoFin | date: 'dd/MM/yyyy, hh:mm:ss a' }}
                  } @else {
                    — (aún no hay sincronizaciones por periodo)
                  }
                </div>
                @if (syncEstado()?.siguienteInicioSugerido; as sugerido) {
                  <div class="sync-meta__sugerido">
                    Siguiente inicio sugerido: {{ sugerido | date: 'dd/MM/yyyy, hh:mm:ss a' }}
                    (−{{ syncEstado()!.offsetMinutos }} min)
                  </div>
                }
              </div>
              <button
                mat-stroked-button
                type="button"
                (click)="usarUltimoCorte()"
                [disabled]="!syncEstado()?.ultimoFin"
              >
                Usar último corte
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="table-card">
          <mat-card-header>
            <mat-card-title>Vista previa desde CRM</mat-card-title>
            <mat-card-subtitle>
              @if (previewSeen()) {
                {{ previewItems().length }} registro(s) en el periodo seleccionado.
              } @else {
                Sin registros para mostrar. Usa Ver registros.
              }
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (previewLoading()) {
              <app-loading-state />
            } @else if (!previewSeen() || previewItems().length === 0) {
              <app-empty-state
                [message]="previewSeen() ? 'No hay empresas en el periodo indicado.' : 'Sin registros para mostrar. Usa Ver registros.'"
                icon="cloud_download"
              />
            } @else {
              <div class="table-wrap">
                <table mat-table [dataSource]="previewItems()">
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
                    <td mat-cell *matCellDef="let e">{{ e.categoria }}</td>
                  </ng-container>
                  <ng-container matColumnDef="actualizado">
                    <th mat-header-cell *matHeaderCellDef>Actualizado CRM</th>
                    <td mat-cell *matCellDef="let e">{{ e.actualizadoUtc | date: 'short' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="estadoLocal">
                    <th mat-header-cell *matHeaderCellDef>Local</th>
                    <td mat-cell *matCellDef="let e">
                      <app-status-chip [status]="e.yaExisteLocal ? 'Actualizar' : 'Nueva'" />
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="previewCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: previewCols"></tr>
                </table>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </ng-container>

      <mat-card appearance="outlined">
        <mat-card-content class="toolbar-filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="form-grid__wide">
            <mat-label>Buscar RUC / razón social</mat-label>
            <input matInput [(ngModel)]="q" (keyup.enter)="search()" />
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="search()">Buscar</button>
          <ng-container *appRoleIf="['Administrador', 'Operador']">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>RUC on-demand</mat-label>
              <input matInput [(ngModel)]="rucSync" />
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="syncOne()">Sync RUC</button>
          </ng-container>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay empresas sincronizadas." icon="business" />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="ruc">
                <th mat-header-cell *matHeaderCellDef>RUC</th>
                <td mat-cell *matCellDef="let e">{{ e.ruc }}</td>
              </ng-container>
              <ng-container matColumnDef="razonSocial">
                <th mat-header-cell *matHeaderCellDef>Razón social</th>
                <td mat-cell *matCellDef="let e">
                  <a class="link-cell" [routerLink]="['/empresas', e.empresaId]">{{ e.razonSocial }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="categoria">
                <th mat-header-cell *matHeaderCellDef>Categoría</th>
                <td mat-cell *matCellDef="let e">{{ e.categoria }}</td>
              </ng-container>
              <ng-container matColumnDef="activo">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let e">
                  <app-status-chip [status]="e.activo ? 'Activo' : 'Inactivo'" />
                </td>
              </ng-container>
              <ng-container matColumnDef="ver">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let e">
                  <a mat-icon-button [routerLink]="['/empresas', e.empresaId]" matTooltip="Ver detalle" aria-label="Ver detalle">
                    <mat-icon>visibility</mat-icon>
                  </a>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          </div>
          <mat-paginator
            [length]="total()"
            [pageIndex]="page() - 1"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
            showFirstLastButtons
          />
        }
      </mat-card>
    </section>
  `,
  styles: `
    .sync-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--gb-space-3);
      align-items: center;
    }
    .sync-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--gb-space-3);
      align-items: center;
      justify-content: space-between;
      margin-top: var(--gb-space-4);
      padding-top: var(--gb-space-3);
      border-top: 1px solid var(--adex-border);
    }
    .sync-meta__text {
      color: var(--adex-text-muted);
      font: var(--mat-sys-body-small);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sync-meta__sugerido {
      color: var(--adex-success);
      font-weight: 500;
    }
    .sync-card mat-card-title,
    .table-card mat-card-title {
      font: var(--mat-sys-title-medium);
      color: var(--adex-blue);
    }
  `
})
export class EmpresasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);

  q = '';
  rucSync = '';
  syncInicio = '';
  syncFin = '';

  loading = signal(true);
  items = signal<Empresa[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  cols = ['ruc', 'razonSocial', 'categoria', 'activo', 'ver'];

  syncEstado = signal<EmpresaSyncEstado | null>(null);
  previewItems = signal<EmpresaSyncPreviewItem[]>([]);
  previewSeen = signal(false);
  previewLoading = signal(false);
  processLoading = signal(false);
  previewCols = ['ruc', 'razonSocial', 'categoria', 'actualizado', 'estadoLocal'];

  canProcesar = computed(() => this.previewSeen() && !!this.syncInicio && !!this.syncFin);

  ngOnInit(): void {
    this.load();
    this.loadSyncEstado();
    this.initDefaultPeriod();
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.empresas(this.q, this.page(), this.pageSize).subscribe({
      next: (r) => {
        this.items.set(r.items ?? []);
        this.total.set(r.total ?? 0);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar empresas.'));
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }

  loadSyncEstado(): void {
    this.api.empresaSyncEstado().subscribe({
      next: (e) => {
        this.syncEstado.set(e);
        if (e.siguienteInicioSugerido) {
          this.syncInicio = this.toLocalInput(e.siguienteInicioSugerido);
          this.syncFin = this.toLocalInput(new Date().toISOString());
        }
      },
      error: () => undefined
    });
  }

  usarUltimoCorte(): void {
    const estado = this.syncEstado();
    if (!estado?.siguienteInicioSugerido || !estado.ultimoFin) return;
    this.syncInicio = this.toLocalInput(estado.siguienteInicioSugerido);
    this.syncFin = this.toLocalInput(new Date().toISOString());
    this.previewSeen.set(false);
    this.previewItems.set([]);
  }

  verRegistros(): void {
    if (!this.syncInicio || !this.syncFin) {
      this.notify.error('Indique inicio y fin del periodo.');
      return;
    }
    this.previewLoading.set(true);
    this.api.empresaSyncPreview(this.toIso(this.syncInicio), this.toIso(this.syncFin)).subscribe({
      next: (r) => {
        this.previewItems.set(r.items ?? []);
        this.previewSeen.set(true);
        this.previewLoading.set(false);
      },
      error: (e) => {
        this.previewLoading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudo obtener la vista previa.'));
      }
    });
  }

  procesar(): void {
    if (!this.canProcesar()) return;
    this.processLoading.set(true);
    this.api.empresaSyncProcesar(this.toIso(this.syncInicio), this.toIso(this.syncFin)).subscribe({
      next: (r) => {
        this.processLoading.set(false);
        this.notify.success(
          `Sincronización completada: ${r.procesadas} procesadas (${r.nuevas} nuevas, ${r.actualizadas} actualizadas).`
        );
        this.previewSeen.set(false);
        this.previewItems.set([]);
        this.loadSyncEstado();
        this.load();
      },
      error: (e) => {
        this.processLoading.set(false);
        this.notify.error(apiErrorMessage(e, 'Error al procesar sincronización'));
      }
    });
  }

  syncOne(): void {
    if (!this.rucSync) return;
    this.api.syncEmpresa(this.rucSync).subscribe({
      next: () => {
        this.notify.success(`Empresa ${this.rucSync} sincronizada.`);
        this.load();
      },
      error: (e) => this.notify.error(apiErrorMessage(e, 'RUC no encontrado en CRM'))
    });
  }

  private initDefaultPeriod(): void {
    const fin = new Date();
    const inicio = new Date(fin.getTime() - 24 * 60 * 60 * 1000);
    this.syncInicio = this.toLocalInput(inicio.toISOString());
    this.syncFin = this.toLocalInput(fin.toISOString());
  }

  private toLocalInput(isoOrLocal: string): string {
    const d = new Date(isoOrLocal);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private toIso(localValue: string): string {
    return new Date(localValue).toISOString();
  }
}
