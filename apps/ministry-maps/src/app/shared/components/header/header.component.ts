import { Component } from '@angular/core';
import { primaryGreen } from '@kingdom-apps/common';

@Component({
  selector: 'kingdom-apps-header',
  styleUrls: ['./header.component.scss'],
  template: `
    <lib-header [logoBackgroundColor]="headerLogoBackgroundColor" initials="MM">
      <div class="header-container__link-container">
        <a class="header-container__link" routerLink="/territories" routerLinkActive="header-container__link--active">
          Território
        </a>
      </div>
    </lib-header>
  `,
})
export class HeaderComponent {
  public headerLogoBackgroundColor = primaryGreen;
}
