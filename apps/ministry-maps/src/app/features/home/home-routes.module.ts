import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { RoleEnum } from '../../../models/enums/role';

export const HOME_ALLOWED_ROLES = [
  RoleEnum.ORGANIZER,
  RoleEnum.ADMIN,
  RoleEnum.ELDER,
  RoleEnum.SUPERINTENDENT,
]

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
