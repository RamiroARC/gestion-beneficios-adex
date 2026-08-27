import { Component, input } from '@angular/core';

@Component({
  selector: 'app-adex-logo',
  standalone: true,
  template: `
    <svg
      class="adex-logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 56"
      role="img"
      [attr.aria-label]="label()"
    >
      <text
        x="0"
        y="36"
        font-family="Roboto, Arial, sans-serif"
        font-size="42"
        font-weight="700"
        font-style="italic"
        fill="currentColor"
      >
        ADEX
      </text>
      <text
        x="3"
        y="52"
        font-family="Roboto, Arial, sans-serif"
        font-size="10"
        font-weight="400"
        letter-spacing="1.2"
        fill="currentColor"
      >
        ASOCIACIÓN DE EXPORTADORES
      </text>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      color: #ffffff;
      line-height: 0;
      width: min(240px, 100%);
    }

    .adex-logo {
      display: block;
      width: 100%;
      height: auto;
    }
  `
})
export class AdexLogoComponent {
  label = input('ADEX - Asociación de Exportadores');
}
