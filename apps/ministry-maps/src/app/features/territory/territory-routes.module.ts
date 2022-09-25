import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';

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
