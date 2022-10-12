import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';
import { TerritoryRoutesModule } from './territory-routes.module';
import { SharedModule } from '../../shared/shared.module';
import { TerritoryManageDialogComponent } from './components/territory-manage-dialog/territory-manage-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [TerritoriesPageComponent, TerritoryManageDialogComponent],
  imports: [CommonModule, TerritoryRoutesModule, SharedModule, ReactiveFormsModule],
})
export class TerritoryModule {}
