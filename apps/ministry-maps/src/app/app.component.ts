import { Component } from '@angular/core';

@Component({
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
export class AppComponent {}
