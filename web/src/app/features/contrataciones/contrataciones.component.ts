import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Contratacion } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { PerfilCatalogService } from '../../core/perfil-catalog.service';
import { ContratacionFormDialogComponent } from './contratacion-form-dialog.component';

@Component({
  selector: 'app-contrataciones',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTableModule,
    MatCardModule,
    MatDialogModule,
    MatPaginatorModule,
    PageHeaderComponent,
    StatusChipComponent,
    EmptyStateComponent,
    LoadingStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="Contrataciones" subtitle="Al crear una contratación vigente se generan puntos (sueldo × meses enteros).">
        @if (canWrite()) {
          <button mat-flat-button type="button" (click)="openNuevo()">Nuevo</button>
        }
      </app-page-header>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay contrataciones." icon="work" />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Id</th><td mat-cell *matCellDef="let c">{{ c.contratacionId }}</td></ng-container>
              <ng-container matColumnDef="empresa"><th mat-header-cell *matHeaderCellDef>Empresa</th><td mat-cell *matCellDef="let c">{{ c.empresaRazonSocial }}</td></ng-container>
              <ng-container matColumnDef="alumno"><th mat-header-cell *matHeaderCellDef>Alumno</th><td mat-cell *matCellDef="let c">{{ c.alumnoNombre }}</td></ng-container>
              <ng-container matColumnDef="vigencia"><th mat-header-cell *matHeaderCellDef>Vigencia</th><td mat-cell *matCellDef="let c">{{ c.fechaInicio }} → {{ c.fechaFin }}</td></ng-container>
              <ng-container matColumnDef="sueldo"><th mat-header-cell *matHeaderCellDef>Sueldo</th><td mat-cell *matCellDef="let c">{{ c.sueldo }}</td></ng-container>
              <ng-container matColumnDef="puntos"><th mat-header-cell *matHeaderCellDef>Puntos</th><td mat-cell *matCellDef="let c">{{ c.puntosGenerados }}</td></ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let c"><app-status-chip [status]="c.estado" /></td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          </div>
          <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
        }
      </mat-card>
    </section>
  `
})
export class ContratacionesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly perfiles = inject(PerfilCatalogService);

  readonly canWrite = computed(() => this.auth.hasAnyRole(['Administrador', 'Operador']));

  items = signal<Contratacion[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  loading = signal(true);
  cols = ['id', 'empresa', 'alumno', 'vigencia', 'sueldo', 'puntos', 'estado'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.contrataciones(undefined, this.page(), this.pageSize).subscribe({
      next: (r) => {
        const items = r.items ?? [];
        this.items.set(items);
        this.total.set(r.total ?? 0);
        this.perfiles.absorb(items.map((c) => c.perfilSolicitado));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar contrataciones.'));
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }

  openNuevo(): void {
    this.dialog
      .open(ContratacionFormDialogComponent, {
        width: '760px',
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
