import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <header class="ph">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
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
    h1 { margin: 0; font: var(--mat-sys-headline-small); color: var(--adex-blue); }
    p { margin: var(--gb-space-2) 0 0; color: var(--adex-text-muted); font: var(--mat-sys-body-medium); }
    .ph__actions { display: flex; flex-wrap: wrap; gap: var(--gb-space-2); }
  `
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
}
