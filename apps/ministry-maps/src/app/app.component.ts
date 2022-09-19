import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';
import { primaryGreen } from '../styles/abstract/variables';

@Component({
  selector: 'kingdom-apps-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public headerLogoBackgroundColor = primaryGreen;

  ngOnInit(): void {
    console.log(environment);
  }
}
