import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './shared/components/header/header.component';
import { PortalAnchorComponent } from '@kingdom-apps/common-ui';

@Component({
  imports: [RouterModule, HeaderComponent, PortalAnchorComponent],
  selector: 'kingdom-apps-root',
  templateUrl: './app.component.html',
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 100%;
      }
    `,
  ],
})
export class AppComponent {
  title = 'ministry-maps';
}
