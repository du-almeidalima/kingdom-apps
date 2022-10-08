import { Component } from '@angular/core';
import { primaryGreen } from '@kingdom-apps/common';
import { FeatureRoutesEnum } from '../../../app-routes.module';

@Component({
  selector: 'kingdom-apps-header',
  styleUrls: ['./header.component.scss'],
  template: `
    <lib-header [logoBackgroundColor]="headerLogoBackgroundColor" initials="MM" [headerLink]="FeatureRoutes.HOME">
      <div class="header-container">
        <p class="header-container__app-name">Ministry Maps</p>
      </div>
    </lib-header>
  `,
})
export class HeaderComponent {
  public readonly FeatureRoutes = FeatureRoutesEnum;
  public headerLogoBackgroundColor = primaryGreen;
}
