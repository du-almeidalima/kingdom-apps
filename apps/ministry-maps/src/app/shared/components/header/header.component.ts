import { Component, inject } from '@angular/core';
import { primaryGreen, white100 } from '@kingdom-apps/common-ui';
import { FeatureRoutesEnum } from '../../../app-routes.module';
import { UserStateService } from '../../../state/user.state.service';

@Component({
  selector: 'kingdom-apps-header',
  styleUrls: ['./header.component.scss'],
  template: `
    <lib-header [logoBackgroundColor]='headerLogoBackgroundColor' initials='MM' [headerLink]='FeatureRoutes.HOME'>
      <div class='header-container'>
        <p class='header-container__app-name'>Ministry Maps</p>
        @if (userStateService.isLoggedIn) {
          <a lib-icon-button
             routerLink='/{{ FeatureRoutes.PROFILE }}'
             title='Meu Perfil'
             class='header-container__user-btn'
          >
            <lib-icon [fillColor]='userIconColor' icon='user-5'></lib-icon>
          </a>
        }
      </div>
    </lib-header>
  `,
})
export class HeaderComponent {
  public readonly FeatureRoutes = FeatureRoutesEnum;
  public readonly headerLogoBackgroundColor = primaryGreen;
  public readonly userIconColor = white100;

  userStateService = inject(UserStateService)
}
