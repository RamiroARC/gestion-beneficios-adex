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
import { Alumno } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { RoleIfDirective } from '../../shared/role-if.directive';
import { AlumnoFormDialogComponent } from './alumno-form-dialog.component';

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [
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
    EmptyStateComponent,
    LoadingStateComponent,
    RoleIfDirective
  ],
  template: `
    <section class="page">
      <app-page-header
        title="Alumnos"
        subtitle="Fuente: CRM de Alumnos. La incorporación es por DNI (búsqueda puntual en el CRM)."
      />

      <mat-card appearance="outlined">
        <mat-card-content class="toolbar-filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="form-grid__wide">
            <mat-label>Buscar en registrados (DNI, código o nombre)</mat-label>
            <input matInput [(ngModel)]="q" (keyup.enter)="search()" />
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="search()">Buscar</button>

          <ng-container *appRoleIf="['Administrador', 'Operador']">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>DNI</mat-label>
              <input
                matInput
                [(ngModel)]="dniSync"
                inputmode="numeric"
                placeholder="Nro. de DNI"
                (keyup.enter)="syncOne()"
              />
            </mat-form-field>
            <button mat-flat-button type="button" (click)="syncOne()" [disabled]="syncLoading()">
              Sync DNI
            </button>
          </ng-container>
        </mat-card-content>
        <mat-card-content class="hint-row">
          <mat-icon class="hint-row__icon">info</mat-icon>
          <span>
            El CRM de Alumnos no expone un listado; para incorporar un alumno ingrese su
            <strong>DNI</strong> y use <strong>Sync DNI</strong>. Una vez registrado, se mantiene
            actualizado automáticamente.
          </span>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state
            message="No hay alumnos registrados. Ingrese un DNI y use Sync DNI para incorporarlo."
            icon="school"
          />
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
    .hint-row {
      display: flex;
      align-items: flex-start;
      gap: var(--gb-space-2);
      color: var(--adex-text-muted);
      font: var(--mat-sys-body-small);
      padding-top: 0;
    }
    .hint-row__icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--adex-blue);
    }
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
  dniSync = '';

  items = signal<Alumno[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  loading = signal(true);
  syncLoading = signal(false);

  ngOnInit(): void {
    this.load();
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

  syncOne(): void {
    const dni = this.dniSync.trim();
    if (!dni) {
      this.notify.error('Ingrese un DNI.');
      return;
    }
    this.syncLoading.set(true);
    this.api.syncAlumno(dni).subscribe({
      next: (a) => {
        this.syncLoading.set(false);
        this.notify.success(`Alumno ${a.dni || a.codigoAlumno} sincronizado desde CRM.`);
        this.dniSync = '';
        this.load();
      },
      error: (e) => {
        this.syncLoading.set(false);
        this.notify.error(apiErrorMessage(e, 'Alumno no encontrado en el CRM para el DNI indicado.'));
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
}
