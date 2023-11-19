import { Component, inject } from '@angular/core';
import { grey400, primaryGreen, red300, white100 } from '@kingdom-apps/common-ui';
import { FeatureRoutesEnum } from '../../../app-routes.module';
import { AuthService } from '../../../core/features/auth/services/auth.service';

@Component({
  selector: 'kingdom-apps-header',
  styleUrls: ['./header.component.scss'],
  template: `
    <lib-header [logoBackgroundColor]="headerLogoBackgroundColor" initials="MM" [headerLink]="FeatureRoutes.HOME">
      <div class="header-container">
        <p class="header-container__app-name">Ministry Maps</p>
        <button lib-icon-button [cdkMenuTriggerFor]='menu' type='button' class="header-container__user-btn">
          <lib-icon [fillColor]='userIconColor' icon='user-5'></lib-icon>
        </button>
      </div>
    </lib-header>

    <!-- MENU -->
    <ng-template #menu>
      <menu class='menu' cdkMenu style='margin-top: .75rem'>
        <li class='menu__item' cdkMenuItem>
          <button lib-icon-button type='button'>
            <lib-icon [fillColor]='greyButtonColor' icon='gear-1'></lib-icon>
          </button>
          <span>Configurações</span>
        </li>
        <!-- SEPARATOR -->
        <hr class='menu__separator'>
        <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='handleLogOut()'>
          <button lib-icon-button type='button'>
            <lib-icon [fillColor]='deleteButtonColor' icon='log-out-7'></lib-icon>
          </button>
          <span class='text-red-500'>Sair</span>
        </li>
      </menu>
    </ng-template>
  `,
})
export class HeaderComponent {
  private authService = inject(AuthService);

  public readonly FeatureRoutes = FeatureRoutesEnum;
  public readonly headerLogoBackgroundColor = primaryGreen;
  public readonly userIconColor = white100;
  public readonly deleteButtonColor = red300;
  public readonly greyButtonColor = grey400;

  handleLogOut() {
    this.authService.logOut();
  }
}
