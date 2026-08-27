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
    LoadingStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="Alumnos" subtitle="Catálogo de alumnos vinculados a contrataciones.">
        @if (canWrite()) {
          <button mat-flat-button type="button" (click)="openForm()">Nuevo</button>
        }
      </app-page-header>

      <mat-card appearance="outlined">
        <mat-card-content class="toolbar-filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Buscar DNI / nombre</mat-label>
            <input matInput [(ngModel)]="q" (keyup.enter)="search()" />
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="search()">Buscar</button>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay alumnos registrados." icon="school" />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="dni">
                <th mat-header-cell *matHeaderCellDef>Nro. DNI</th>
                <td mat-cell *matCellDef="let a">{{ a.codigoAlumno }}</td>
              </ng-container>
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let a">{{ a.nombres }} {{ a.apellidos }}</td>
              </ng-container>
              <ng-container matColumnDef="carrera">
                <th mat-header-cell *matHeaderCellDef>Carrera</th>
                <td mat-cell *matCellDef="let a">{{ a.carrera }}</td>
              </ng-container>
              <ng-container matColumnDef="correo">
                <th mat-header-cell *matHeaderCellDef>Correo</th>
                <td mat-cell *matCellDef="let a">{{ a.correo }}</td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let a">
                  @if (canWrite()) {
                    <button mat-icon-button type="button" matTooltip="Editar" aria-label="Editar alumno" (click)="openForm(a); $event.stopPropagation()">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols()"></tr>
              <tr mat-row *matRowDef="let row; columns: cols()" [class.row-selectable]="canWrite()" (click)="canWrite() && openForm(row)"></tr>
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
  `
})
export class AlumnosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly carreras = inject(CarreraCatalogService);

  readonly canWrite = computed(() => this.auth.hasAnyRole(['Administrador', 'Operador']));
  private readonly allCols = ['dni', 'nombre', 'carrera', 'correo', 'acciones'] as const;
  cols = computed(() =>
    this.canWrite() ? [...this.allCols] : this.allCols.filter((c) => c !== 'acciones')
  );

  q = '';
  items = signal<Alumno[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  loading = signal(true);
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

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }

  openForm(alumno?: Alumno): void {
    this.dialog
      .open(AlumnoFormDialogComponent, {
        width: '760px',
        data: { alumno },
        autoFocus: 'first-tabbable'
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.page.set(1);
          this.load();
        }
      });
  }
}
