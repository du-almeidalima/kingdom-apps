import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';

export enum HomeRoutesEnum {
  INDEX = '',
}

const HOME_ROUTES: Routes = [
  {
    path: HomeRoutesEnum.INDEX,
    component: HomePageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(HOME_ROUTES)],
  exports: [RouterModule],
})
export class HomeRoutesModule {}
