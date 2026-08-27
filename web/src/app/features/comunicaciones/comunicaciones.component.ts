import { Component, OnInit, inject, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../core/api.service';
import { CorreoEnviado, PlantillaCorreo } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-comunicaciones',
  standalone: true,
  imports: [
    MatTableModule,
    MatTabsModule,
    MatCardModule,
    MatPaginatorModule,
    PageHeaderComponent,
    StatusChipComponent,
    EmptyStateComponent,
    LoadingStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="Comunicaciones" subtitle="Plantillas y historial de envíos." />
      <mat-card appearance="outlined">
        <mat-tab-group>
          <mat-tab label="Plantillas">
            @if (loadingPlantillas()) {
              <app-loading-state />
            } @else if (plantillas().length === 0) {
              <app-empty-state message="No hay plantillas." icon="mail" />
            } @else {
              <div class="table-wrap">
                <table mat-table [dataSource]="plantillas()">
                  <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let p">{{ p.codigo }}</td></ng-container>
                  <ng-container matColumnDef="asunto"><th mat-header-cell *matHeaderCellDef>Asunto</th><td mat-cell *matCellDef="let p">{{ p.asunto }}</td></ng-container>
                  <ng-container matColumnDef="activo">
                    <th mat-header-cell *matHeaderCellDef>Estado</th>
                    <td mat-cell *matCellDef="let p"><app-status-chip [status]="p.activo ? 'Activo' : 'Inactivo'" /></td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="plantillaCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: plantillaCols"></tr>
                </table>
              </div>
              <mat-paginator [length]="plantillasTotal()" [pageIndex]="plantillasPage() - 1" [pageSize]="plantillasPageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPlantillasPage($event)" />
            }
          </mat-tab>
          <mat-tab label="Correos enviados">
            @if (loadingCorreos()) {
              <app-loading-state />
            } @else if (correos().length === 0) {
              <app-empty-state message="No hay correos registrados." icon="mail" />
            } @else {
              <div class="table-wrap">
                <table mat-table [dataSource]="correos()">
                  <ng-container matColumnDef="dest"><th mat-header-cell *matHeaderCellDef>Destinatario</th><td mat-cell *matCellDef="let c">{{ c.destinatario }}</td></ng-container>
                  <ng-container matColumnDef="asunto"><th mat-header-cell *matHeaderCellDef>Asunto</th><td mat-cell *matCellDef="let c">{{ c.asunto }}</td></ng-container>
                  <ng-container matColumnDef="estado">
                    <th mat-header-cell *matHeaderCellDef>Estado</th>
                    <td mat-cell *matCellDef="let c"><app-status-chip [status]="c.estado" /></td>
                  </ng-container>
                  <ng-container matColumnDef="intentos"><th mat-header-cell *matHeaderCellDef>Intentos</th><td mat-cell *matCellDef="let c">{{ c.intentos }}</td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="correoCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: correoCols"></tr>
                </table>
              </div>
              <mat-paginator [length]="correosTotal()" [pageIndex]="correosPage() - 1" [pageSize]="correosPageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onCorreosPage($event)" />
            }
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </section>
  `
})
export class ComunicacionesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);

  plantillas = signal<PlantillaCorreo[]>([]);
  correos = signal<CorreoEnviado[]>([]);
  plantillasTotal = signal(0);
  correosTotal = signal(0);
  plantillasPage = signal(1);
  correosPage = signal(1);
  plantillasPageSize = 50;
  correosPageSize = 50;
  loadingPlantillas = signal(true);
  loadingCorreos = signal(true);
  plantillaCols = ['codigo', 'asunto', 'activo'];
  correoCols = ['dest', 'asunto', 'estado', 'intentos'];

  ngOnInit(): void {
    this.loadPlantillas();
    this.loadCorreos();
  }

  loadPlantillas(): void {
    this.loadingPlantillas.set(true);
    this.api.plantillas(this.plantillasPage(), this.plantillasPageSize).subscribe({
      next: (r) => {
        this.plantillas.set(r.items ?? []);
        this.plantillasTotal.set(r.total ?? 0);
        this.loadingPlantillas.set(false);
      },
      error: (e) => {
        this.loadingPlantillas.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar plantillas.'));
      }
    });
  }

  loadCorreos(): void {
    this.loadingCorreos.set(true);
    this.api.correos(this.correosPage(), this.correosPageSize).subscribe({
      next: (r) => {
        this.correos.set(r.items ?? []);
        this.correosTotal.set(r.total ?? 0);
        this.loadingCorreos.set(false);
      },
      error: (e) => {
        this.loadingCorreos.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar correos.'));
      }
    });
  }

  onPlantillasPage(ev: PageEvent): void {
    this.plantillasPage.set(ev.pageIndex + 1);
    this.plantillasPageSize = ev.pageSize;
    this.loadPlantillas();
  }

  onCorreosPage(ev: PageEvent): void {
    this.correosPage.set(ev.pageIndex + 1);
    this.correosPageSize = ev.pageSize;
    this.loadCorreos();
  }
}
