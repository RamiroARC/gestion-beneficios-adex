import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty" role="status">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: `
    .empty {
      display: grid;
      place-items: center;
      gap: var(--gb-space-2);
      padding: var(--gb-space-6);
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }
    mat-icon { font-size: 40px; width: 40px; height: 40px; }
    p { margin: 0; font: var(--mat-sys-body-medium); }
  `
})
export class EmptyStateComponent {
  message = input('No hay registros para mostrar.');
  icon = input('inbox');
}
