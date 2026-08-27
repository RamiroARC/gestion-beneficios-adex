import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading" role="status" [attr.aria-label]="label()">
      <mat-spinner diameter="36" />
      <span>{{ label() }}</span>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      align-items: center;
      gap: var(--gb-space-4);
      padding: var(--gb-space-6);
      color: var(--mat-sys-on-surface-variant);
    }
  `
})
export class LoadingStateComponent {
  label = input('Cargando…');
}
