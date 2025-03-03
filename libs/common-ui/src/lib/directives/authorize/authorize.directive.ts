import { Directive, input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthUserStateService } from '../../state/';

/** Generic App Admin Role.*/
export const APP_ADMIN_ROLE = 'APP_ADMIN' as const;

@Directive({
  selector: '[libAuthorize]',
  standalone: true,
})
export class AuthorizeDirective implements OnInit {

  roles = input.required<string | string[]>({ alias: 'libAuthorize' });

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly authUserStateService: AuthUserStateService,
  ) {
  }

  ngOnInit(): void {
    if (!this.roles() || !this.roles()?.length) {
      this._createEmbeddedView();
      return;
    }

    const user = this.authUserStateService.currentUser;

    // This directive needs authentication, if the user is logged out or null, don't show anything
    if (!user) {
      this._clearEmbeddedView();
      return;
    }

    const userRoles = typeof user.roles === 'string' ? [user.roles] : user.roles;

    // @ts-expect-error: TypeScript is not correctly inferring types when using signals
    const directiveRoles: string[] = typeof this.roles() === 'string' ? [this.roles()] : this.roles();

    const containsRoles = directiveRoles.some(directiveRole => userRoles.includes(directiveRole));

    if (containsRoles || userRoles.includes(APP_ADMIN_ROLE)) {
      this._createEmbeddedView();
      return;
    } else {
      this._clearEmbeddedView();
    }
  }

  private _createEmbeddedView() {
    this.viewContainerRef.createEmbeddedView(this.templateRef);
  }

  private _clearEmbeddedView() {
    this.viewContainerRef.clear();
  }
}
