import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './shared/components/header/header.component';

@Component({
  imports: [RouterModule, HeaderComponent],
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
