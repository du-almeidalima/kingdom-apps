import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CdkMenuModule } from '@angular/cdk/menu';

import { CommonDirectivesModule } from '@kingdom-apps/common-ui';

import { SharedModule } from '../../shared/shared.module';
import { TerritoryManageDialogComponent } from './components/territory-manage-dialog/territory-manage-dialog.component';
import { AssignTerritoriesPageComponent } from './pages/assign-territories-page/assign-territories-page.component';
import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';
import { TerritoryRoutesModule } from './territory-routes.module';
import { TerritoryCheckboxComponent } from './components/territory-checkbox/territory-checkbox.component';
import { TerritoryListItemComponent } from './components/territory-list-item/territory-list-item.component';
import { TerritoryDeleteDialogComponent } from './components/territory-delete-dialog/territory-delete-dialog.component';
import { TerritoryMoveAlertDialogComponent } from './components/territory-move-alert-dialog/territory-move-alert-dialog.component';
import { TerritoryBO } from './bo/territory.bo';
import { TerritoryAlertsBO } from './bo/territory-alerts.bo';

@NgModule({
  declarations: [
    AssignTerritoriesPageComponent,
    TerritoriesPageComponent,
    TerritoryCheckboxComponent,
    TerritoryManageDialogComponent,
    TerritoryListItemComponent,
    TerritoryDeleteDialogComponent,
    TerritoryMoveAlertDialogComponent,
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CdkMenuModule,
    CommonModule,
    CommonDirectivesModule,
    SharedModule,
    TerritoryRoutesModule,
  ],
  providers: [TerritoryBO, TerritoryAlertsBO],
})
export class TerritoryModule {}
