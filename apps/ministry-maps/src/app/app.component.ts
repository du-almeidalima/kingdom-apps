import { Component, OnInit } from '@angular/core';
import { primaryGreen } from '@kingdom-apps/common';
import { UserStateService } from './state/user.state.service';
import { FirebaseAuthDatasourceService } from './core/features/auth/repositories/firebase/firebase-auth-datasource.service';

@Component({
  selector: 'kingdom-apps-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public headerLogoBackgroundColor = primaryGreen;

  constructor(
    private readonly firebaseAuthDatasourceService: FirebaseAuthDatasourceService,
    private readonly userState: UserStateService
  ) {}

  ngOnInit(): void {
    this.firebaseAuthDatasourceService.getUserFromAuthentication().subscribe(user => {
      if (user) {
        this.userState.setUser(user);
      }
    });
  }
}
