import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule } from '@angular/material/badge';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { isAppRole, moreNavForRole, primaryNavForRole, ROLE_LABELS } from './app-role';
import { AdexLogoComponent } from './adex-logo.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    AdexLogoComponent
  ],
  template: `
    <div class="shell">
      <header class="topnav">
        <div class="topnav__inner">
          <button
            class="topnav__burger"
            mat-icon-button
            type="button"
            aria-label="Abrir menú"
            (click)="mobileOpen.set(true)"
          >
            <mat-icon>menu</mat-icon>
          </button>

          <a routerLink="/dashboard" class="brand" aria-label="ADEX Inicio">
            <app-adex-logo class="brand__logo" />
          </a>
          <span class="brand__divider" aria-hidden="true"></span>

          <nav class="topnav__links" aria-label="Principal">
            @for (item of allNav(); track item.path) {
              <a
                class="topnav__link"
                [routerLink]="item.path"
                routerLinkActive="topnav__link--active"
                [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                [title]="item.label"
              >
                <mat-icon>{{ item.icon }}</mat-icon>
                <span class="topnav__label">{{ item.label }}</span>
              </a>
            }
          </nav>

          <div class="topnav__actions">
            <button mat-icon-button type="button" class="topnav__notify" aria-label="Notificaciones" matBadge="0" matBadgeSize="small" matBadgeColor="warn" [matBadgeHidden]="true">
              <mat-icon>notifications</mat-icon>
            </button>

            <button mat-button type="button" class="user-chip" [matMenuTriggerFor]="userMenu">
              <span class="user-chip__avatar" aria-hidden="true">{{ initials() }}</span>
              <span class="user-chip__meta">
                <strong>{{ auth.userName() || 'Usuario' }}</strong>
                <small>{{ roleLabel() }}</small>
              </span>
              <mat-icon class="user-chip__caret">arrow_drop_down</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <div class="user-menu-role" mat-menu-item disabled>{{ roleLabel() }}</div>
              <button mat-menu-item type="button" (click)="auth.logout()">
                <mat-icon>logout</mat-icon>
                <span>Cerrar sesión</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </header>

      <mat-sidenav-container class="shell__body">
        <mat-sidenav
          class="mobile-drawer"
          mode="over"
          [opened]="mobileOpen()"
          (closedStart)="mobileOpen.set(false)"
        >
          <div class="mobile-drawer__brand">
            <app-adex-logo />
          </div>
          <mat-nav-list>
            @for (item of allNav(); track item.path) {
              <a
                mat-list-item
                [routerLink]="item.path"
                routerLinkActive="nav-active"
                [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                (click)="mobileOpen.set(false)"
              >
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content>
          <main class="main">
            <router-outlet />
          </main>
          <footer class="footer">
            <span>ADEX — Asociación de Exportadores | Plataforma de Beneficios</span>
            <span class="footer__version">Versión 2.0.0</span>
          </footer>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--adex-bg);
    }
    .topnav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--adex-blue);
      color: var(--adex-white);
      box-shadow: 0 1px 3px rgb(0 59 112 / 18%);
    }
    .topnav__inner {
      --gb-nav-item-height: 40px;
      display: flex;
      align-items: center;
      gap: var(--gb-space-2);
      min-height: var(--gb-toolbar-height);
      padding: 0 var(--gb-space-4);
      max-width: 100%;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      height: var(--gb-nav-item-height);
      text-decoration: none;
      flex-shrink: 0;
    }
    .brand__logo {
      width: 150px;
    }
    .brand__divider {
      width: 1px;
      height: 28px;
      background: rgb(255 255 255 / 28%);
      margin: 0 var(--gb-space-2);
      flex-shrink: 0;
    }
    .topnav__burger { display: none; color: var(--adex-white); }
    .topnav__links {
      display: flex;
      align-items: center;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      gap: 2px;
      min-width: 0;
      overflow: hidden;
    }
    .topnav__link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: var(--gb-nav-item-height);
      min-width: 0;
      padding: 0 10px;
      border-radius: var(--gb-radius-sm);
      color: rgb(255 255 255 / 88%);
      text-decoration: none;
      font: var(--mat-sys-label-large);
      white-space: nowrap;
      border: 0;
      background: transparent;
      cursor: pointer;
      letter-spacing: 0;
    }
    .topnav__link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin: 0;
      color: inherit;
      flex-shrink: 0;
    }
    .topnav__link:hover { background: rgb(255 255 255 / 10%); color: var(--adex-white); }
    .topnav__link--active,
    .topnav__link.router-link-active {
      background: var(--adex-blue-active);
      color: var(--adex-white);
    }
    .topnav__actions {
      display: flex;
      align-items: center;
      gap: var(--gb-space-1);
      margin-left: auto;
      flex-shrink: 0;
    }
    .topnav__notify {
      color: var(--adex-white);
      width: var(--gb-nav-item-height);
      height: var(--gb-nav-item-height);
      padding: 0;
    }
    .user-chip {
      --mdc-text-button-container-height: 48px;
      display: inline-flex;
      align-items: center;
      gap: var(--gb-space-2);
      color: var(--adex-white);
      height: 48px;
      min-width: 0;
      padding: 0 var(--gb-space-2);
      border-radius: 999px;
      letter-spacing: 0;
    }
    .user-chip:hover { background: rgb(255 255 255 / 10%); }
    .user-chip__avatar {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      border-radius: 50%;
      background: rgb(255 255 255 / 18%);
      display: grid;
      place-items: center;
      font: var(--mat-sys-label-large);
      font-weight: 600;
      line-height: 1;
    }
    .user-chip__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 1px;
      min-width: 0;
      max-width: 160px;
      line-height: 1.2;
      text-align: left;
    }
    .user-chip__meta strong,
    .user-chip__meta small {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-chip__meta strong { font: var(--mat-sys-label-large); font-weight: 600; letter-spacing: 0; }
    .user-chip__meta small { font: var(--mat-sys-body-small); opacity: 0.8; letter-spacing: 0; }
    .user-chip__caret { margin: 0; flex-shrink: 0; }
    .user-menu-role { opacity: 0.7; font: var(--mat-sys-label-medium); }
    .shell__body { flex: 1; }
    .mobile-drawer {
      width: min(300px, 86vw);
      background: var(--adex-blue);
      color: var(--adex-white);
      --mat-sidenav-container-background-color: var(--adex-blue);
      --mat-list-list-item-label-text-color: var(--adex-white);
      --mat-list-list-item-leading-icon-color: var(--adex-white);
    }
    .mobile-drawer__brand {
      padding: var(--gb-space-5) var(--gb-space-4);
      border-bottom: 1px solid rgb(255 255 255 / 16%);
    }
    .mobile-drawer__brand app-adex-logo {
      width: 160px;
    }
    .nav-active { background: var(--adex-blue-active); }
    .main {
      padding: var(--gb-space-5) var(--gb-space-5) var(--gb-space-4);
      min-height: calc(100vh - var(--gb-toolbar-height) - 48px);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: var(--gb-space-3);
      padding: var(--gb-space-3) var(--gb-space-5);
      border-top: 1px solid var(--adex-border);
      color: var(--adex-text-muted);
      font: var(--mat-sys-body-small);
      background: var(--adex-white);
    }
    .footer__version { white-space: nowrap; }
    @media (max-width: 1600px) {
      .brand__logo { width: 130px; }
      .topnav__link { gap: 5px; padding: 0 8px; font-size: 13px; }
    }
    @media (max-width: 1400px) {
      .brand__logo { width: 118px; }
      .topnav__link { gap: 4px; padding: 0 6px; font-size: 12.5px; }
      .topnav__link mat-icon { font-size: 17px; width: 17px; height: 17px; }
    }
    @media (max-width: 1280px) {
      .user-chip__meta { display: none; }
      .user-chip { padding: 0 var(--gb-space-1); }
    }
    @media (max-width: 1180px) {
      .topnav__label { display: none; }
      .topnav__link { padding: 0 8px; }
    }
    @media (max-width: 768px) {
      .topnav__burger { display: inline-flex; }
      .brand__divider,
      .topnav__links { display: none; }
      .main { padding: var(--gb-space-4); }
      .footer { flex-direction: column; align-items: flex-start; }
    }
  `
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly breakpoints = inject(BreakpointObserver);

  mobileOpen = signal(false);

  isMobile = toSignal(
    this.breakpoints.observe('(max-width: 768px)').pipe(map((s) => s.matches)),
    { initialValue: false }
  );

  readonly primaryNav = computed(() => primaryNavForRole(this.auth.role()));
  readonly moreNav = computed(() => moreNavForRole(this.auth.role()));
  readonly allNav = computed(() => [...this.primaryNav(), ...this.moreNav()]);

  roleLabel = computed(() => {
    const role = this.auth.role();
    return role && isAppRole(role) ? ROLE_LABELS[role] : role ?? '';
  });

  initials = computed(() => {
    const name = (this.auth.userName() || 'U').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });
}
