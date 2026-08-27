import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { NotifyService } from '../../core/notify.service';
import { apiErrorMessage } from '../../core/http-error';
import { APP_ROLES, ROLE_HINTS, type AppRole } from '../../core/app-role';
import { AdexLogoComponent } from '../../core/adex-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatIconModule, AdexLogoComponent],
  template: `
    <div class="login">
      <div class="login__card">
        <aside class="login__hero">
          <div class="login__hero-bg" aria-hidden="true"></div>
          <div class="login__hero-content">
            <div class="login__logo-block">
              <app-adex-logo class="login__logo" />
              <h1 class="login__hero-title">Sistema de Gestión de Beneficios para Empresas Asociadas</h1>
            </div>
            <p class="login__hero-desc">
              Plataforma integral que facilita la gestión de beneficios, servicios y comunicaciones para
              empresas asociadas, impulsando su crecimiento y competitividad.
            </p>
            <div class="login__features">
              <div class="login__feature">
                <mat-icon>business</mat-icon>
                <div>
                  <strong>Gestión integral</strong>
                  <span>Administra empresas, beneficios y servicios de manera eficiente.</span>
                </div>
              </div>
              <div class="login__feature">
                <mat-icon>bar_chart</mat-icon>
                <div>
                  <strong>Información estratégica</strong>
                  <span>Reportes y métricas en tiempo real para una mejor toma de decisiones.</span>
                </div>
              </div>
              <div class="login__feature">
                <mat-icon>verified_user</mat-icon>
                <div>
                  <strong>Seguridad garantizada</strong>
                  <span>Protegemos tu información con los más altos estándares de seguridad.</span>
                </div>
              </div>
            </div>
            <p class="login__hero-footer">© 2025 ADEX - Asociación de Exportadores | Todos los derechos reservados</p>
          </div>
        </aside>

        <section class="login__panel">
          <div class="login__lang" aria-hidden="true">
            <mat-icon>language</mat-icon>
            <span>Español</span>
            <mat-icon class="login__lang-chevron">expand_more</mat-icon>
          </div>

          <div class="login__form-wrap">
            <header class="login__header">
              <h2>Bienvenido</h2>
              <p>Inicia sesión para acceder</p>
            </header>

            <form [formGroup]="form" (ngSubmit)="submit()" class="login__form">
              <label class="field">
                <span class="field__label">Usuario</span>
                <span class="field__control">
                  <mat-icon class="field__icon">person</mat-icon>
                  <input
                    type="text"
                    formControlName="userName"
                    autocomplete="username"
                    placeholder="Ingresa tu usuario"
                  />
                </span>
              </label>

              <label class="field">
                <span class="field__label">Rol</span>
                <span class="field__control">
                  <mat-icon class="field__icon">shield</mat-icon>
                  <select formControlName="role" (change)="onRoleChange()">
                    @for (role of roles; track role) {
                      <option [value]="role">{{ role }}</option>
                    }
                  </select>
                  <mat-icon class="field__chevron">expand_more</mat-icon>
                </span>
              </label>

              <p class="role-hint">{{ roleHint() }}</p>

              <label class="remember">
                <input type="checkbox" formControlName="remember" />
                <span>Recordarme en este dispositivo</span>
              </label>

              @if (error()) {
                <p class="login__error" role="alert">{{ error() }}</p>
              }

              <button class="btn btn--primary" type="submit" [disabled]="form.invalid || loading()">
                <mat-icon>lock</mat-icon>
                {{ loading() ? 'Iniciando sesión…' : 'Iniciar sesión' }}
              </button>

              <div class="login__divider"><span>o continuar con</span></div>

              <button class="btn btn--secondary" type="button" disabled title="Próximamente">
                <mat-icon>vpn_key</mat-icon>
                Acceso temporal (Stub Login Centros)
              </button>
            </form>

            <p class="login__help">
              <mat-icon>headset_mic</mat-icon>
              ¿Necesitas ayuda? <a href="mailto:soporte@adex.org.pe">Contáctanos</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .login {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: var(--gb-space-4);
      background: var(--adex-bg);
    }

    .login__card {
      display: grid;
      grid-template-columns: 1fr 1fr;
      width: min(1080px, 100%);
      min-height: min(640px, calc(100vh - 2 * var(--gb-space-4)));
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 24px 48px rgba(0, 35, 70, 0.12);
    }

    .login__hero {
      position: relative;
      background: linear-gradient(165deg, #001a33 0%, var(--adex-blue) 45%, #004a8f 100%);
      color: var(--adex-white);
      overflow: hidden;
    }

    .login__hero-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 72% 18%, rgba(80, 160, 255, 0.35) 0%, transparent 42%),
        radial-gradient(circle at 55% 8%, rgba(120, 190, 255, 0.2) 0%, transparent 35%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 40%);
      pointer-events: none;
    }

    .login__hero-bg::before {
      content: '';
      position: absolute;
      top: 6%;
      right: 8%;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      border: 1px solid rgba(120, 190, 255, 0.25);
      box-shadow:
        0 0 0 24px rgba(120, 190, 255, 0.06),
        0 0 0 48px rgba(120, 190, 255, 0.03);
    }

    .login__hero-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--gb-space-6) var(--gb-space-5);
    }

    .login__logo {
      width: min(240px, 100%);
    }

    .login__hero-title {
      margin: var(--gb-space-4) 0 0;
      font: 700 1.25rem/1.35 Roboto, sans-serif;
      letter-spacing: -0.01em;
      color: var(--adex-white);
    }

    .login__hero-desc {
      margin: 0;
      max-width: 36ch;
      font: 400 0.875rem/1.55 Roboto, sans-serif;
      color: rgba(255, 255, 255, 0.82);
    }

    .login__features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--gb-space-4);
      margin-top: auto;
      padding-top: var(--gb-space-6);
    }

    .login__feature {
      display: flex;
      flex-direction: column;
      gap: var(--gb-space-2);
    }

    .login__feature mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: rgba(255, 255, 255, 0.9);
    }

    .login__feature strong {
      display: block;
      font: 600 0.75rem/1.3 Roboto, sans-serif;
      margin-bottom: 2px;
    }

    .login__feature span {
      font: 400 0.6875rem/1.45 Roboto, sans-serif;
      color: rgba(255, 255, 255, 0.72);
    }

    .login__hero-footer {
      margin: var(--gb-space-5) 0 0;
      font: 400 0.6875rem/1.4 Roboto, sans-serif;
      color: rgba(255, 255, 255, 0.55);
    }

    .login__panel {
      display: flex;
      flex-direction: column;
      background: var(--adex-white);
      padding: var(--gb-space-5) var(--gb-space-6);
    }

    .login__lang {
      align-self: flex-end;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      font: 500 0.8125rem/1 Roboto, sans-serif;
      color: var(--adex-text-muted);
    }

    .login__lang mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .login__lang-chevron {
      margin-left: 2px;
      opacity: 0.6;
    }

    .login__form-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 380px;
      width: 100%;
      margin: 0 auto;
      padding: var(--gb-space-4) 0;
    }

    .login__header h2 {
      margin: 0 0 var(--gb-space-2);
      font: 700 1.75rem/1.2 Roboto, sans-serif;
      color: var(--adex-blue);
    }

    .login__header strong {
      color: var(--adex-text);
      font-weight: 600;
    }

    .login__header p {
      margin: 0 0 var(--gb-space-5);
      font: 400 0.875rem/1.5 Roboto, sans-serif;
      color: var(--adex-text-muted);
    }

    .login__form {
      display: flex;
      flex-direction: column;
      gap: var(--gb-space-3);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field__label {
      font: 500 0.8125rem/1 Roboto, sans-serif;
      color: var(--adex-text);
    }

    .field__control {
      position: relative;
      display: flex;
      align-items: center;
    }

    .field__icon {
      position: absolute;
      left: 12px;
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--adex-text-muted);
      pointer-events: none;
    }

    .field__chevron {
      position: absolute;
      right: 10px;
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--adex-text-muted);
      pointer-events: none;
    }

    .field__control input,
    .field__control select {
      width: 100%;
      height: var(--gb-control-height);
      padding: 0 36px 0 40px;
      border: 1px solid var(--adex-border);
      border-radius: var(--gb-radius-sm);
      background: var(--adex-white);
      font: 400 0.875rem/1 Roboto, sans-serif;
      color: var(--adex-text);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
    }

    .field__control input:focus,
    .field__control select:focus {
      border-color: var(--adex-blue);
      box-shadow: 0 0 0 3px rgba(0, 59, 112, 0.12);
    }

    .field__control input::placeholder {
      color: #9aa5ad;
    }

    .role-hint {
      margin: 0;
      font: var(--mat-sys-body-small);
      color: var(--adex-text-muted);
      min-height: 1.25rem;
    }

    .remember {
      display: inline-flex;
      align-items: center;
      gap: var(--gb-space-2);
      margin: var(--gb-space-1) 0;
      font: 400 0.8125rem/1 Roboto, sans-serif;
      color: var(--adex-text-muted);
      cursor: pointer;
    }

    .remember input {
      width: 16px;
      height: 16px;
      accent-color: var(--adex-blue);
    }

    .login__error {
      margin: 0;
      font: 400 0.8125rem/1.4 Roboto, sans-serif;
      color: var(--adex-error);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--gb-space-2);
      width: 100%;
      height: var(--gb-control-height);
      border-radius: var(--gb-radius-sm);
      font: 600 0.875rem/1 Roboto, sans-serif;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    }

    .btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn--primary {
      margin-top: var(--gb-space-2);
      border: none;
      background: var(--adex-blue);
      color: var(--adex-white);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--adex-blue-hover);
    }

    .btn--primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn--secondary {
      border: 1px solid var(--adex-border);
      background: var(--adex-white);
      color: var(--adex-blue);
    }

    .btn--secondary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .login__divider {
      display: flex;
      align-items: center;
      gap: var(--gb-space-3);
      margin: var(--gb-space-2) 0;
      color: var(--adex-text-muted);
      font: 400 0.75rem/1 Roboto, sans-serif;
    }

    .login__divider::before,
    .login__divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--adex-border);
    }

    .login__help {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: var(--gb-space-5) 0 0;
      font: 400 0.8125rem/1 Roboto, sans-serif;
      color: var(--adex-text-muted);
    }

    .login__help mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .login__help a {
      color: var(--adex-blue);
      font-weight: 600;
      text-decoration: none;
    }

    .login__help a:hover {
      text-decoration: underline;
    }

    @media (max-width: 900px) {
      .login__card {
        grid-template-columns: 1fr;
        min-height: auto;
      }

      .login__hero-content {
        padding: var(--gb-space-5) var(--gb-space-4);
      }

      .login__features {
        grid-template-columns: 1fr;
        gap: var(--gb-space-3);
      }

      .login__hero-footer {
        display: none;
      }

      .login__panel {
        padding: var(--gb-space-4);
      }
    }
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);

  loading = signal(false);
  error = signal('');
  roles = APP_ROLES;
  roleHint = signal(ROLE_HINTS.Administrador);
  form = this.fb.nonNullable.group({
    userName: ['admin', Validators.required],
    role: ['Administrador' as AppRole, Validators.required],
    remember: [false]
  });

  onRoleChange(): void {
    const role = this.form.controls.role.value;
    this.roleHint.set(ROLE_HINTS[role]);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { userName, role } = this.form.getRawValue();
    this.auth.login(userName, role).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        const msg = apiErrorMessage(err, 'No se pudo autenticar. ¿API en marcha?');
        this.error.set(msg);
        this.notify.error(msg);
      }
    });
  }
}
