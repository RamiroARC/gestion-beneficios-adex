import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatChipsModule],
  template: `
    <mat-chip [class]="toneClass()" disableRipple>
      <span class="dot" aria-hidden="true"></span>{{ label() }}
    </mat-chip>
  `,
  styles: `
    :host { display: inline-flex; }
    mat-chip {
      --mdc-chip-container-height: 26px;
      font-weight: 600;
      font-size: 12px;
    }
    .dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 7px;
      background: currentColor;
      vertical-align: middle;
    }
    .tone-success {
      --mdc-chip-elevated-container-color: var(--adex-success-container);
      --mdc-chip-label-text-color: var(--adex-success);
    }
    .tone-warning {
      --mdc-chip-elevated-container-color: var(--adex-warning-container);
      --mdc-chip-label-text-color: var(--adex-warning);
    }
    .tone-error {
      --mdc-chip-elevated-container-color: var(--adex-error-container);
      --mdc-chip-label-text-color: var(--adex-error);
    }
    .tone-info {
      --mdc-chip-elevated-container-color: var(--adex-info-container);
      --mdc-chip-label-text-color: var(--adex-info);
    }
    .tone-neutral {
      --mdc-chip-elevated-container-color: var(--adex-surface-3);
      --mdc-chip-label-text-color: var(--adex-text-muted);
    }
  `
})
export class StatusChipComponent {
  status = input.required<string>();

  label = computed(() => this.status() || '—');

  toneClass = computed(() => {
    const s = (this.status() || '').toLowerCase();
    if (['activo', 'vigente', 'enviado', 'procesado', 'valido', 'válido', 'canjeable'].some((x) => s.includes(x))) return 'tone-success';
    if (['pendiente', 'previsualizacion', 'próx', 'prox'].some((x) => s.includes(x))) return 'tone-warning';
    if (['inactivo', 'vencid', 'error', 'anulado', 'invalido', 'insuficiente'].some((x) => s.includes(x))) return 'tone-error';
    if (['consulta', 'info'].some((x) => s.includes(x))) return 'tone-info';
    return 'tone-neutral';
  });
}
