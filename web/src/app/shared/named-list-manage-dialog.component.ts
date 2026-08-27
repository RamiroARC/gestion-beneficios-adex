import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { NamedListCatalogService } from '../core/named-list-catalog.service';
import { NotifyService } from '../core/notify.service';

export interface NamedListManageData {
  title: string;
  hint: string;
  addLabel: string;
  catalogKey: string;
}

@Component({
  selector: 'app-named-list-manage-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ data.hint }}</p>
      <div class="add-row">
        <mat-form-field appearance="outline">
          <mat-label>{{ data.addLabel }}</mat-label>
          <input matInput [(ngModel)]="nombre" (keyup.enter)="add()" />
        </mat-form-field>
        <button mat-flat-button type="button" (click)="add()">Agregar</button>
      </div>
      @if (items().length === 0) {
        <p class="hint">Aún no hay registros. Agregue el primero.</p>
      } @else {
        <mat-list>
          @for (c of items(); track c) {
            <mat-list-item>
              <span matListItemTitle>{{ c }}</span>
              <button mat-icon-button matListItemMeta type="button" aria-label="Quitar" (click)="catalog.remove(data.catalogKey, c)">
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
export class NamedListManageDialogComponent {
  readonly data = inject<NamedListManageData>(MAT_DIALOG_DATA);
  readonly catalog = inject(NamedListCatalogService);
  private readonly notify = inject(NotifyService);
  readonly items = this.catalog.list(this.data.catalogKey);
  nombre = '';

  add(): void {
    if (this.catalog.add(this.data.catalogKey, this.nombre)) {
      this.nombre = '';
    } else {
      this.notify.error('Ingrese un nombre que aún no exista.');
    }
  }
}
