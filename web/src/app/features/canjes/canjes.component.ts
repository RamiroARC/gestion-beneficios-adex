import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Canje, Empresa } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { CanjeFormDialogComponent } from './canje-form-dialog.component';

@Component({
  selector: 'app-canjes',
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
      <app-page-header title="Canjes" subtitle="Descuento inmediato (sin flujo de aprobación — decisión provisional Fase 0).">
        @if (canWrite()) {
          <button mat-flat-button type="button" (click)="openNuevo()">Nuevo canje</button>
        }
      </app-page-header>

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay canjes." icon="redeem" />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="ruc"><th mat-header-cell *matHeaderCellDef>RUC</th><td mat-cell *matCellDef="let c">{{ c.empresaRuc }}</td></ng-container>
              <ng-container matColumnDef="empresa">
                <th mat-header-cell *matHeaderCellDef>Empresa</th>
                <td mat-cell *matCellDef="let c">{{ c.empresaRazonSocial }}</td>
              </ng-container>
              <ng-container matColumnDef="beneficio"><th mat-header-cell *matHeaderCellDef>Beneficio</th><td mat-cell *matCellDef="let c">{{ c.beneficioNombre }}</td></ng-container>
              <ng-container matColumnDef="puntos"><th mat-header-cell *matHeaderCellDef>Puntos</th><td mat-cell *matCellDef="let c">{{ c.puntosUsados }}</td></ng-container>
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
export class CanjesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  readonly canWrite = computed(() => this.auth.hasAnyRole(['Administrador', 'Operador']));

  private readonly empresasCatalog = signal<Empresa[]>([]);

  items = signal<Canje[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  loading = signal(true);
  cols = ['ruc', 'empresa', 'beneficio', 'puntos', 'estado'];

  ngOnInit(): void {
    this.load();
    this.api.empresas('', 1, 200).subscribe({
      next: (r) => {
        this.empresasCatalog.set(r.items ?? []);
        this.items.set(this.enrichCanjes(this.items()));
      },
      error: () => undefined
    });
  }

  openNuevo(): void {
    this.dialog
      .open(CanjeFormDialogComponent, {
        width: '820px',
        maxHeight: '90vh',
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

  load(): void {
    this.loading.set(true);
    this.api.canjes(undefined, this.page(), this.pageSize).subscribe({
      next: (r) => {
        this.items.set(this.enrichCanjes(r.items ?? []));
        this.total.set(r.total ?? 0);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar canjes.'));
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }

  private enrichCanjes(items: Canje[]): Canje[] {
    const byId = new Map(this.empresasCatalog().map((e) => [e.empresaId, e]));
    return items.map((c) => {
      if (c.empresaRuc && c.empresaRazonSocial) return c;
      const e = byId.get(c.empresaId);
      return {
        ...c,
        empresaRuc: c.empresaRuc || e?.ruc || '',
        empresaRazonSocial: c.empresaRazonSocial || e?.razonSocial || ''
      };
    });
  }
}
