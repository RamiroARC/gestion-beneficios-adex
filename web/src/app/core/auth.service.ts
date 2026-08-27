import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { hasAnyRole as roleMatches, type AppRole } from './app-role';

interface DevTokenResponse {
  access_token: string;
  token_type: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'gb_token';
  private readonly roleKey = 'gb_role';
  private readonly userKey = 'gb_user';

  readonly token = signal<string | null>(localStorage.getItem(this.storageKey));
  readonly role = signal<string | null>(localStorage.getItem(this.roleKey));
  readonly userName = signal<string | null>(localStorage.getItem(this.userKey));

  constructor(private http: HttpClient, private router: Router) {}

  isAuthenticated(): boolean {
    return !!this.token();
  }

  hasAnyRole(roles: readonly AppRole[]): boolean {
    return roleMatches(this.role(), roles);
  }

  /** Stub Login Centros: emite JWT de desarrollo. */
  login(userName: string, role = 'Administrador') {
    return this.http
      .post<DevTokenResponse>(`${environment.apiBaseUrl}/auth/dev-token`, { userName, role })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.storageKey, res.access_token);
          localStorage.setItem(this.roleKey, res.role);
          localStorage.setItem(this.userKey, userName);
          this.token.set(res.access_token);
          this.role.set(res.role);
          this.userName.set(userName);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.role.set(null);
    this.userName.set(null);
    void this.router.navigateByUrl('/login');
  }
}
