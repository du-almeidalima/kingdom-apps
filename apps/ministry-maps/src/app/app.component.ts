import { Component, OnInit } from '@angular/core';

import { UserStateService } from './state/user.state.service';
import { FirebaseAuthDatasourceService } from './core/features/auth/repositories/firebase/firebase-auth-datasource.service';

@Component({
  selector: 'kingdom-apps-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
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
