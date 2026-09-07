import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CarreraCatalogService } from '../../core/carrera-catalog.service';
import { Alumno, AlumnoSyncEstado, AlumnoSyncPreviewItem } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { RoleIfDirective } from '../../shared/role-if.directive';
import { AlumnoFormDialogComponent } from './alumno-form-dialog.component';

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatCardModule,
    MatDialogModule,
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
      <app-page-header
        title="Alumnos"
        subtitle="Fuente: CRM de Alumnos (sincronización local). Sin alta manual."
      />

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
              <button
                mat-stroked-button
                type="button"
                (click)="syncCatalogo()"
                [disabled]="catalogLoading()"
              >
                Sincronizar catálogo completo
              </button>
            </div>

            <p class="sync-note">
              El periodo filtra por fecha de alta en CRM (createdOn) cuando el listado está disponible (mock).
              Contra CRM real use Sync DNI/código: la API solo expone búsqueda puntual.
              Para actualizar alumnos existentes en mock, use Sincronizar catálogo completo.
            </p>

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
                [message]="previewSeen() ? 'No hay alumnos en el periodo indicado.' : 'Sin registros para mostrar. Usa Ver registros.'"
                icon="cloud_download"
              />
            } @else {
              <div class="table-wrap">
                <table mat-table [dataSource]="previewItems()">
                  <ng-container matColumnDef="dni">
                    <th mat-header-cell *matHeaderCellDef>DNI</th>
                    <td mat-cell *matCellDef="let a">{{ a.dni }}</td>
                  </ng-container>
                  <ng-container matColumnDef="codigo">
                    <th mat-header-cell *matHeaderCellDef>Código</th>
                    <td mat-cell *matCellDef="let a">{{ a.codAlumno }}</td>
                  </ng-container>
                  <ng-container matColumnDef="nombre">
                    <th mat-header-cell *matHeaderCellDef>Nombre</th>
                    <td mat-cell *matCellDef="let a">{{ a.nombres }} {{ a.apellidos }}</td>
                  </ng-container>
                  <ng-container matColumnDef="carrera">
                    <th mat-header-cell *matHeaderCellDef>Carrera</th>
                    <td mat-cell *matCellDef="let a">{{ a.carrera || '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="modalidad">
                    <th mat-header-cell *matHeaderCellDef>Modalidad</th>
                    <td mat-cell *matCellDef="let a">{{ a.modalidad || '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="actualizado">
                    <th mat-header-cell *matHeaderCellDef>Alta CRM</th>
                    <td mat-cell *matCellDef="let a">{{ (a.crmCreatedOn || a.actualizadoUtc) | date: 'short' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="estadoLocal">
                    <th mat-header-cell *matHeaderCellDef>Local</th>
                    <td mat-cell *matCellDef="let a">
                      <app-status-chip [status]="a.yaExisteLocal ? 'Actualizar' : 'Nueva'" />
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
            <mat-label>Buscar DNI / código / nombre</mat-label>
            <input matInput [(ngModel)]="q" (keyup.enter)="search()" />
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="search()">Buscar</button>
          <ng-container *appRoleIf="['Administrador', 'Operador']">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>DNI / código on-demand</mat-label>
              <input matInput [(ngModel)]="criterioSync" />
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="syncOne()">Sync DNI/código</button>
          </ng-container>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay alumnos sincronizados." icon="school" />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="dni">
                <th mat-header-cell *matHeaderCellDef>Nro. DNI</th>
                <td mat-cell *matCellDef="let a">{{ a.dni || a.codigoAlumno }}</td>
              </ng-container>
              <ng-container matColumnDef="codigo">
                <th mat-header-cell *matHeaderCellDef>Código</th>
                <td mat-cell *matCellDef="let a">{{ a.crmAlumnoCodigo || a.codigoAlumno }}</td>
              </ng-container>
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let a">{{ a.nombres }} {{ a.apellidos }}</td>
              </ng-container>
              <ng-container matColumnDef="carrera">
                <th mat-header-cell *matHeaderCellDef>Carrera</th>
                <td mat-cell *matCellDef="let a">{{ a.carrera }}</td>
              </ng-container>
              <ng-container matColumnDef="modalidad">
                <th mat-header-cell *matHeaderCellDef>Modalidad</th>
                <td mat-cell *matCellDef="let a">{{ a.modalidad || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="correo">
                <th mat-header-cell *matHeaderCellDef>Correo</th>
                <td mat-cell *matCellDef="let a">{{ a.correo }}</td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let a" class="col-actions">
                  @if (canWrite()) {
                    <button
                      mat-icon-button
                      type="button"
                      matTooltip="Editar alumno"
                      aria-label="Editar alumno"
                      (click)="openForm(a); $event.stopPropagation()"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols()"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: cols()"
                [class.row-selectable]="canWrite()"
                (click)="canWrite() && openForm(row)"
              ></tr>
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
    .sync-note {
      margin: var(--gb-space-3) 0 0;
      color: var(--adex-text-muted);
      font: var(--mat-sys-body-small);
    }
    .sync-card mat-card-title,
    .table-card mat-card-title {
      font: var(--mat-sys-title-medium);
      color: var(--adex-blue);
    }
    .col-actions {
      width: 56px;
      text-align: right;
      white-space: nowrap;
    }
  `
})
export class AlumnosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly carreras = inject(CarreraCatalogService);

  readonly canWrite = computed(() => this.auth.hasAnyRole(['Administrador', 'Operador']));
  private readonly allCols = ['dni', 'codigo', 'nombre', 'carrera', 'modalidad', 'correo', 'acciones'] as const;
  cols = computed(() =>
    this.canWrite() ? [...this.allCols] : this.allCols.filter((c) => c !== 'acciones')
  );

  q = '';
  criterioSync = '';
  syncInicio = '';
  syncFin = '';

  items = signal<Alumno[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  loading = signal(true);

  syncEstado = signal<AlumnoSyncEstado | null>(null);
  previewItems = signal<AlumnoSyncPreviewItem[]>([]);
  previewSeen = signal(false);
  previewLoading = signal(false);
  processLoading = signal(false);
  catalogLoading = signal(false);
  previewCols = ['dni', 'codigo', 'nombre', 'carrera', 'modalidad', 'actualizado', 'estadoLocal'];

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
    this.api.alumnos(this.q, this.page(), this.pageSize).subscribe({
      next: (r) => {
        const items = r.items ?? [];
        this.items.set(items);
        this.total.set(r.total ?? 0);
        this.carreras.absorb(items.map((a) => a.carrera));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudo cargar el listado de alumnos.'));
      }
    });
  }

  loadSyncEstado(): void {
    this.api.alumnoSyncEstado().subscribe({
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
    this.api.alumnoSyncPreview(this.toIso(this.syncInicio), this.toIso(this.syncFin)).subscribe({
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
    this.api.alumnoSyncProcesar(this.toIso(this.syncInicio), this.toIso(this.syncFin)).subscribe({
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
    if (!this.criterioSync.trim()) return;
    this.api.syncAlumno(this.criterioSync.trim()).subscribe({
      next: (a) => {
        this.notify.success(`Alumno ${a.dni || a.codigoAlumno} sincronizado desde CRM.`);
        this.criterioSync = '';
        this.load();
      },
      error: (e) => this.notify.error(apiErrorMessage(e, 'Alumno no encontrado en CRM'))
    });
  }

  syncCatalogo(): void {
    if (!window.confirm('¿Sincronizar todos los alumnos desde el CRM? Puede tardar varios minutos.')) return;

    this.catalogLoading.set(true);
    this.api.alumnoSyncCatalogo().subscribe({
      next: (r) => {
        this.catalogLoading.set(false);
        this.notify.success(
          `Catálogo sincronizado: ${r.procesadas} procesadas (${r.nuevas} nuevas, ${r.actualizadas} actualizadas).`
        );
        this.load();
      },
      error: (e) => {
        this.catalogLoading.set(false);
        this.notify.error(apiErrorMessage(e, 'Error al sincronizar catálogo completo.'));
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }

  openForm(alumno: Alumno): void {
    if (!this.canWrite() || !alumno) return;
    this.dialog
      .open(AlumnoFormDialogComponent, {
        width: '760px',
        data: { alumno },
        autoFocus: 'first-tabbable'
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
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
