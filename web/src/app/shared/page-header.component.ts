import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <header class="ph">
      <div class="ph__title">
        <span class="ph__accent" aria-hidden="true"></span>
        <div>
          <h1>{{ title() }}</h1>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="ph__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .ph {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--gb-space-4);
      flex-wrap: wrap;
    }
    .ph__title { display: flex; align-items: flex-start; gap: var(--gb-space-3); }
    .ph__accent {
      width: 4px;
      align-self: stretch;
      min-height: 36px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--adex-blue) 0%, var(--adex-blue-active) 100%);
      flex-shrink: 0;
    }
    h1 { margin: 0; font: var(--mat-sys-headline-small); font-weight: 700; color: var(--adex-blue); letter-spacing: -0.01em; }
    p { margin: var(--gb-space-1) 0 0; color: var(--adex-text-muted); font: var(--mat-sys-body-medium); }
    .ph__actions { display: flex; flex-wrap: wrap; gap: var(--gb-space-2); align-items: center; }
  `
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
}
