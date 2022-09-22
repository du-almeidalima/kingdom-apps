import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { CommonComponentsModule } from '@kingdom-apps/common';

const AUTH_ROUTES: Routes = [{ path: '', component: LoginPageComponent }];

@NgModule({
  declarations: [LoginPageComponent],
  imports: [CommonModule, RouterModule.forChild(AUTH_ROUTES), CommonComponentsModule],
})
export class AuthModule {}
