import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { TerritoryManageDialogComponent } from './components/territory-manage-dialog/territory-manage-dialog.component';
import { AssignTerritoriesPageComponent } from './pages/assign-territories-page/assign-territories-page.component';
import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';
import { TerritoryRoutesModule } from './territory-routes.module';
import { TerritoryCheckboxComponent } from './components/territory-checkbox/territory-checkbox.component';

@NgModule({
  declarations: [
    AssignTerritoriesPageComponent,
    TerritoriesPageComponent,
    TerritoryCheckboxComponent,
    TerritoryManageDialogComponent,
  ],
  imports: [CommonModule, TerritoryRoutesModule, SharedModule, ReactiveFormsModule, FormsModule],
})
export class TerritoryModule {}
