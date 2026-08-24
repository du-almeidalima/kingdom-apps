import { Component, inject } from '@angular/core';
import { HeaderComponent as LibHeaderComponent, IconButtonComponent, IconComponent } from '@kingdom-apps/common-ui';
import { FeatureRoutesEnum } from '../../../app-routes';
import { UserStateService } from '../../../state/user.state.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kingdom-apps-header',
  styleUrls: ['./header.component.scss'],
  template: `
    <lib-header
      [backgroundColorVar]="headerBackgroundColor"
      [logoBackgroundColor]="headerLogoBackgroundColor"
      initials="MM"
      [headerLink]="FeatureRoutes.HOME"
    >
      <div class="header-container" data-testid="header-nav">
        <p class="header-container__app-name">Ministry Maps</p>
        @if (userStateService.isLoggedIn) {
          <a
            lib-icon-button
            routerLink="/{{ FeatureRoutes.PROFILE }}"
            title="Meu Perfil"
            class="header-container__user-btn"
            id="profile-link"
          >
            <lib-icon [fillColor]="userIconColor" icon="user-5"></lib-icon>
          </a>
        }
      </div>
    </lib-header>
  `,
  imports: [IconComponent, IconButtonComponent, RouterLink, LibHeaderComponent],
})
export class HeaderComponent {
  public readonly FeatureRoutes = FeatureRoutesEnum;
  public readonly headerBackgroundColor = 'var(--mm-color-shell-header)';
  public readonly headerLogoBackgroundColor = 'var(--mm-color-shell-header-logo-bg)';
  public readonly userIconColor = 'currentColor';

  userStateService = inject(UserStateService);
}
