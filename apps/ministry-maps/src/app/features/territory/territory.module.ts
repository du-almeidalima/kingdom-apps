import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';
import { TerritoryRoutesModule } from './territory-routes.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [TerritoriesPageComponent],
  imports: [CommonModule, TerritoryRoutesModule, SharedModule],
})
export class TerritoryModule {}
