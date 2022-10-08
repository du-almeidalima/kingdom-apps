import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkWithHref } from '@angular/router';

import { HomePageComponent } from './pages/home-page/home-page.component';
import { SharedModule } from '../../shared/shared.module';
import { HomeRoutesModule } from './home-routes.module';

@NgModule({
  declarations: [HomePageComponent],
  imports: [CommonModule, SharedModule, HomeRoutesModule, RouterLinkWithHref],
})
export class HomeModule {}
