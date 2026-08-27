import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

export type KpiTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  template: `
    <mat-card appearance="outlined" class="kpi" [class]="toneClass()">
      <div class="kpi__head">
        <div class="kpi__icon" aria-hidden="true">
          <mat-icon>{{ icon() }}</mat-icon>
        </div>
        <div class="kpi__meta">
          <div class="kpi__label">{{ label() }}</div>
          @if (subtitle()) {
            <div class="kpi__subtitle">{{ subtitle() }}</div>
          }
        </div>
        @if (badge()) {
          <span class="kpi__badge">{{ badge() }}</span>
        }
      </div>
      <div class="kpi__value">{{ value() }}</div>
      @if (detail()) {
        <div class="kpi__detail">{{ detail() }}</div>
      }
      @if (progress() !== null) {
        <div class="kpi__progress" role="progressbar" [attr.aria-valuenow]="progress()" aria-valuemin="0" aria-valuemax="100">
          <span class="kpi__progress-bar" [style.width.%]="progress()"></span>
        </div>
      }
    </mat-card>
  `,
  styles: `
    .kpi {
      display: flex;
      flex-direction: column;
      gap: var(--gb-space-2);
      padding: var(--gb-space-4);
      border-color: var(--adex-border);
      min-height: 132px;
    }
    .kpi__head {
      display: flex;
      align-items: flex-start;
      gap: var(--gb-space-3);
    }
    .kpi__icon {
      width: 36px;
      height: 36px;
      border-radius: var(--gb-radius-sm);
      display: grid;
      place-items: center;
      background: var(--adex-blue);
      color: var(--adex-white);
      flex-shrink: 0;
    }
    .kpi__icon mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .kpi__meta {
      flex: 1;
      min-width: 0;
    }
    .kpi__label {
      font: var(--mat-sys-label-medium);
      color: var(--adex-text-muted);
      line-height: 1.3;
    }
    .kpi__subtitle {
      margin-top: 2px;
      font: var(--mat-sys-body-small);
      color: var(--adex-text-muted);
    }
    .kpi__badge {
      flex-shrink: 0;
      padding: 2px 8px;
      border-radius: 999px;
      font: var(--mat-sys-label-small);
      background: var(--adex-blue-soft);
      color: var(--adex-blue);
      white-space: nowrap;
    }
    .kpi__value {
      font: var(--mat-sys-headline-small);
      font-weight: 600;
      color: var(--adex-blue);
      line-height: 1.1;
    }
    .kpi__detail {
      font: var(--mat-sys-body-small);
      color: var(--adex-text-muted);
    }
    .kpi__progress {
      height: 4px;
      border-radius: 999px;
      background: var(--adex-border);
      overflow: hidden;
      margin-top: auto;
    }
    .kpi__progress-bar {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--adex-blue);
    }
    .kpi--success .kpi__icon { background: var(--adex-success); }
    .kpi--success .kpi__value { color: var(--adex-success); }
    .kpi--success .kpi__progress-bar { background: var(--adex-success); }
    .kpi--success .kpi__badge { background: var(--adex-success-container); color: var(--adex-success); }
    .kpi--warning .kpi__icon { background: var(--adex-warning); }
    .kpi--warning .kpi__value { color: var(--adex-warning); }
    .kpi--warning .kpi__progress-bar { background: var(--adex-warning); }
    .kpi--warning .kpi__badge { background: var(--adex-warning-container); color: var(--adex-warning); }
    .kpi--danger .kpi__icon { background: var(--adex-red); }
    .kpi--danger .kpi__value { color: var(--adex-red); }
    .kpi--danger .kpi__progress-bar { background: var(--adex-red); }
    .kpi--danger .kpi__badge { background: var(--adex-error-container); color: var(--adex-error); }
    .kpi--info .kpi__icon { background: var(--adex-info); }
    .kpi--info .kpi__value { color: var(--adex-info); }
    .kpi--info .kpi__progress-bar { background: var(--adex-info); }
    .kpi--info .kpi__badge { background: var(--adex-info-container); color: var(--adex-info); }
  `
})
export class KpiCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input('insights');
  subtitle = input<string | undefined>();
  detail = input<string | undefined>();
  badge = input<string | undefined>();
  progress = input<number | null>(null);
  tone = input<KpiTone>('default');

  toneClass(): string {
    const t = this.tone();
    return t === 'default' ? '' : `kpi--${t}`;
  }
}
