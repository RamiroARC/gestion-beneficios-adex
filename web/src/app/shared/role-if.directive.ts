import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { hasAnyRole, type AppRole } from '../core/app-role';
import { AuthService } from '../core/auth.service';

@Directive({
  selector: '[appRoleIf]',
  standalone: true
})
export class RoleIfDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);
  private allowed: readonly AppRole[] = [];

  @Input() set appRoleIf(roles: AppRole | readonly AppRole[]) {
    this.allowed = Array.isArray(roles) ? roles : [roles];
    this.render();
  }

  constructor() {
    effect(() => {
      this.auth.role();
      this.render();
    });
  }

  private render(): void {
    this.viewContainer.clear();
    if (hasAnyRole(this.auth.role(), this.allowed)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
