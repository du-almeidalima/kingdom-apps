import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoleEnum } from '../../../models/enums/role';
import { HearingTerritoriesPageComponent } from './pages/hearing-territories-page/hearing-territories-page.component';
import {
  HearingAssignTerritoriesPageComponent
} from './pages/hearing-assign-territories-page/hearing-assign-territories-page.component';

export const HEARING_TERRITORY_ALLOWED_ROLES = [
  RoleEnum.ORGANIZER,
  RoleEnum.ADMIN,
  RoleEnum.ELDER,
]

export enum HearingTerritoryRoutesEnum {
  LIST = '',
  ASSIGN_TERRITORIES = 'assign',
}

const HEARING_TERRITORY_ROUTES: Routes = [
  {
    path: HearingTerritoryRoutesEnum.LIST,
    component: HearingTerritoriesPageComponent,
  },
  {
    path: HearingTerritoryRoutesEnum.ASSIGN_TERRITORIES,
    component: HearingAssignTerritoriesPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(HEARING_TERRITORY_ROUTES)],
  exports: [RouterModule],
})
export class HearingTerritoryRoutesModule {}
