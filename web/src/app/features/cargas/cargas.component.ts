import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/api.service';
import { CargaDetalle, CargaMasiva } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-cargas',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    PageHeaderComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header
        title="Carga masiva"
        subtitle="Descargue la plantilla, complete las filas y súbala en formato .xlsx."
      >
        <button mat-stroked-button type="button" (click)="downloadPlantilla()" [disabled]="downloading()">
          <mat-icon>download</mat-icon>
          Descargar plantilla
        </button>
      </app-page-header>
      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="file-row">
            <input #fileInput type="file" accept=".xlsx" hidden (change)="onFile($event)" />
            <button mat-flat-button type="button" (click)="fileInput.click()">
              <mat-icon>upload_file</mat-icon>
              Seleccionar Excel
            </button>
            <span class="page__intro">Use la plantilla. Fechas: yyyy-MM-dd. codigoalumno = Nro. DNI.</span>
          </div>
        </mat-card-content>
      </mat-card>

      @if (carga(); as c) {
        <mat-card appearance="outlined">
          <mat-card-content>
            <p>
              Carga #{{ c.cargaId }} ·
              <app-status-chip [status]="c.estado" />
              · válidas {{ c.filasValidas }} / inválidas {{ c.filasInvalidas }}
            </p>
            <button mat-flat-button type="button" (click)="confirmar()" [disabled]="c.filasValidas === 0">
              Confirmar válidos
            </button>
          </mat-card-content>
        </mat-card>
        <mat-card appearance="outlined" class="table-card">
          @if (detalles().length === 0) {
            <app-empty-state message="Sin filas en la previsualización." />
          } @else {
            <div class="table-wrap">
              <table mat-table [dataSource]="detalles()">
                <ng-container matColumnDef="fila"><th mat-header-cell *matHeaderCellDef>Fila</th><td mat-cell *matCellDef="let d">{{ d.numeroFila }}</td></ng-container>
                <ng-container matColumnDef="ok">
                  <th mat-header-cell *matHeaderCellDef>Válido</th>
                  <td mat-cell *matCellDef="let d"><app-status-chip [status]="d.esValido ? 'Válido' : 'Inválido'" /></td>
                </ng-container>
                <ng-container matColumnDef="errores"><th mat-header-cell *matHeaderCellDef>Errores</th><td mat-cell *matCellDef="let d">{{ d.errores }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols"></tr>
              </table>
            </div>
          }
        </mat-card>
      }
    </section>
  `
})
export class CargasComponent {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);

  carga = signal<CargaMasiva | null>(null);
  detalles = signal<CargaDetalle[]>([]);
  downloading = signal(false);
  cols = ['fila', 'ok', 'errores'];

  downloadPlantilla(): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.api.downloadPlantillaCarga().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-carga-masiva.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
        this.notify.success('Plantilla descargada.');
      },
      error: (e) => {
        this.downloading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudo descargar la plantilla.'));
      }
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.uploadCarga(file).subscribe({
      next: (c) => {
        this.carga.set(c);
        this.notify.success('Archivo validado. Revise la previsualización.');
        this.api.cargaDetalles(c.cargaId).subscribe((d) => this.detalles.set(d));
      },
      error: (e) => this.notify.error(apiErrorMessage(e, 'Error al subir'))
    });
  }

  confirmar(): void {
    const current = this.carga();
    if (!current) return;
    this.api.confirmarCarga(current.cargaId).subscribe({
      next: (c) => {
        this.carga.set(c);
        this.notify.success(`Procesadas ${c.filasProcesadas} filas correctamente.`);
      },
      error: (e) => this.notify.error(apiErrorMessage(e, 'Error al confirmar'))
    });
  }
}
