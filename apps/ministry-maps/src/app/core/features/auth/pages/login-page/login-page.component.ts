import { Component } from '@angular/core';
import { FIREBASE_PROVIDERS } from '../../repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'kingdom-apps-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent {
  constructor(private authService: AuthService, private router: Router) {}

  onGoogleClick() {
    this.authService.signInWithProvider(FIREBASE_PROVIDERS.GOOGLE).subscribe(() => {
      this.router.navigate(['']);
    });
  }
}
