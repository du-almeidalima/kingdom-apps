import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthModule } from './features/auth/auth.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, AuthModule],
})
export class CoreModule {}
