import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AssignTerritoriesPageComponent } from './pages/assign-territories-page/assign-territories-page.component';
import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';

export enum TerritoryRoutesEnum {
  LIST = '',
  ASSIGN_TERRITORIES = 'assign',
}

const TERRITORY_ROUTES: Routes = [
  {
    path: TerritoryRoutesEnum.LIST,
    component: TerritoriesPageComponent,
  },
  {
    path: TerritoryRoutesEnum.ASSIGN_TERRITORIES,
    component: AssignTerritoriesPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(TERRITORY_ROUTES)],
  exports: [RouterModule],
})
export class TerritoryRoutesModule {}
