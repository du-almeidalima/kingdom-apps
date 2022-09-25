import { Component } from '@angular/core';
import { AuthRepository } from '../../repository/auth.repository';
import { FIREBASE_PROVIDERS } from '../../repository/firebase/firebase-auth-datasource.service';

@Component({
  selector: 'kingdom-apps-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent {
  constructor(private readonly authRepository: AuthRepository) {}

  onGoogleClick() {
    this.authRepository.signInWithProvider(FIREBASE_PROVIDERS.GOOGLE).subscribe(userRes => {
      console.log(userRes);
    });
  }
}
