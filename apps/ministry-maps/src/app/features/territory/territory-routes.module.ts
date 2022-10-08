import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';

export enum TerritoryRoutesEnum {
  LIST = '',
  CREATE_LIST = 'create-list',
}

const TERRITORY_ROUTES: Routes = [
  {
    path: '',
    component: TerritoriesPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(TERRITORY_ROUTES)],
  exports: [RouterModule],
})
export class TerritoryRoutesModule {}
