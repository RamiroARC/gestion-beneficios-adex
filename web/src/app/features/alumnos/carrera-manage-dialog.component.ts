import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { CarreraCatalogService } from '../../core/carrera-catalog.service';
import { NotifyService } from '../../core/notify.service';

@Component({
  selector: 'app-carrera-manage-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Carreras</h2>
    <mat-dialog-content>
      <p class="hint">Catálogo de selección para el registro de alumnos.</p>
      <div class="add-row">
        <mat-form-field appearance="outline">
          <mat-label>Nueva carrera</mat-label>
          <input matInput [(ngModel)]="nombre" (keyup.enter)="add()" />
        </mat-form-field>
        <button mat-flat-button type="button" (click)="add()">Agregar</button>
      </div>
      @if (carreras.list().length === 0) {
        <p class="hint">Aún no hay carreras. Agregue la primera.</p>
      } @else {
        <mat-list>
          @for (c of carreras.list(); track c) {
            <mat-list-item>
              <span matListItemTitle>{{ c }}</span>
              <button mat-icon-button matListItemMeta type="button" aria-label="Quitar carrera" (click)="carreras.remove(c)">
                <mat-icon>delete</mat-icon>
              </button>
            </mat-list-item>
          }
        </mat-list>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close type="button">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .hint { margin: 0 0 var(--gb-space-3); color: var(--adex-text-muted); }
    .add-row { align-items: center; }
    mat-dialog-content { min-width: min(420px, 80vw); }
  `
})
export class CarreraManageDialogComponent {
  readonly carreras = inject(CarreraCatalogService);
  private readonly notify = inject(NotifyService);
  nombre = '';

  add(): void {
    if (this.carreras.add(this.nombre)) {
      this.nombre = '';
    } else {
      this.notify.error('Ingrese un nombre de carrera que aún no exista.');
    }
  }
}
