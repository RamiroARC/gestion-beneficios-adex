import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatChipsModule],
  template: `
    <mat-chip [class]="toneClass()" disableRipple>
      {{ label() }}
    </mat-chip>
  `,
  styles: `
    :host { display: inline-flex; }
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
      --mdc-chip-elevated-container-color: var(--adex-bg);
      --mdc-chip-label-text-color: var(--adex-text-muted);
    }
  `
})
export class StatusChipComponent {
  status = input.required<string>();

  label = computed(() => this.status() || '—');

  toneClass = computed(() => {
    const s = (this.status() || '').toLowerCase();
    if (['activo', 'vigente', 'enviado', 'procesado', 'valido', 'válido'].some((x) => s.includes(x))) return 'tone-success';
    if (['pendiente', 'previsualizacion', 'próx', 'prox'].some((x) => s.includes(x))) return 'tone-warning';
    if (['inactivo', 'vencid', 'error', 'anulado', 'invalido'].some((x) => s.includes(x))) return 'tone-error';
    if (['consulta', 'info'].some((x) => s.includes(x))) return 'tone-info';
    return 'tone-neutral';
  });
}
