import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersPageComponent } from './pages/users-page/users-page.component';

export enum UsersRoutesEnum {
  INDEX = '',
}

const USERS_ROUTES: Routes = [
  {
    path: UsersRoutesEnum.INDEX,
    component: UsersPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(USERS_ROUTES)],
  exports: [RouterModule],
})
export class UsersRoutesModule {}
