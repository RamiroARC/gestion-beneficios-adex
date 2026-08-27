import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Beneficio } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { TipoBeneficioCatalogService } from '../../core/tipo-beneficio-catalog.service';
import { BeneficioFormDialogComponent } from './beneficio-form-dialog.component';

@Component({
  selector: 'app-beneficios',
  standalone: true,
  imports: [
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
    LoadingStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="Catálogo de beneficios" subtitle="Costo en puntos de cursos y programas.">
        @if (canManage()) {
          <button mat-flat-button type="button" (click)="openForm()">Nuevo</button>
        }
      </app-page-header>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay beneficios." icon="card_giftcard" />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="nombre"><th mat-header-cell *matHeaderCellDef>Nombre</th><td mat-cell *matCellDef="let b">{{ b.nombre }}</td></ng-container>
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef>Tipo</th><td mat-cell *matCellDef="let b">{{ b.tipo }}</td></ng-container>
              <ng-container matColumnDef="costo"><th mat-header-cell *matHeaderCellDef>Costo</th><td mat-cell *matCellDef="let b">{{ b.costoPuntos }}</td></ng-container>
              <ng-container matColumnDef="activo">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let b"><app-status-chip [status]="b.activo ? 'Activo' : 'Inactivo'" /></td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let b">
                  @if (canManage()) {
                    <button mat-icon-button type="button" matTooltip="Editar" aria-label="Editar beneficio" (click)="openForm(b); $event.stopPropagation()">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols()"></tr>
              <tr mat-row *matRowDef="let row; columns: cols()" [class.row-selectable]="canManage()" (click)="canManage() && openForm(row)"></tr>
            </table>
          </div>
          <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
        }
      </mat-card>
    </section>
  `
})
export class BeneficiosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly tipos = inject(TipoBeneficioCatalogService);

  readonly canManage = computed(() => this.auth.hasAnyRole(['Administrador', 'GestionBeneficios']));
  private readonly allCols = ['nombre', 'tipo', 'costo', 'activo', 'acciones'] as const;
  cols = computed(() =>
    this.canManage() ? [...this.allCols] : this.allCols.filter((c) => c !== 'acciones')
  );

  items = signal<Beneficio[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 50;
  loading = signal(true);
  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.beneficios(undefined, this.page(), this.pageSize).subscribe({
      next: (r) => {
        const items = r.items ?? [];
        this.items.set(items);
        this.total.set(r.total ?? 0);
        this.tipos.absorb(items.map((b) => b.tipo));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar beneficios.'));
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }

  openForm(beneficio?: Beneficio): void {
    this.dialog
      .open(BeneficioFormDialogComponent, {
        width: '560px',
        data: { beneficio },
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
