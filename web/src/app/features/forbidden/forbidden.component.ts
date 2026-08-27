import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ROLE_LABELS, isAppRole } from '../../core/app-role';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <section class="forbidden">
      <mat-card appearance="outlined">
        <mat-icon color="warn">block</mat-icon>
        <h1>Sin permiso</h1>
        <p>
          Tu rol
          <strong>{{ roleLabel }}</strong>
          no tiene acceso a esta sección.
        </p>
        <a mat-flat-button routerLink="/dashboard">Ir al dashboard</a>
      </mat-card>
    </section>
  `,
  styles: `
    .forbidden {
      min-height: 60vh;
      display: grid;
      place-items: center;
    }
    mat-card {
      max-width: 420px;
      text-align: center;
      padding: var(--gb-space-6);
    }
    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: var(--gb-space-3);
    }
    h1 {
      margin: 0 0 var(--gb-space-2);
      font: var(--mat-sys-headline-small);
    }
    p {
      margin: 0 0 var(--gb-space-5);
      color: var(--adex-text-muted);
    }
  `
})
export class ForbiddenComponent {
  private readonly auth = inject(AuthService);
  roleLabel = (() => {
    const role = this.auth.role();
    return role && isAppRole(role) ? ROLE_LABELS[role] : role ?? '—';
  })();
}
