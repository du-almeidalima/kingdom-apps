import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { HearingTerritoryRoutesModule } from './hearing-territory-routes.module';
import { HearingTerritoriesPageComponent } from './pages/hearing-territories-page/hearing-territories-page.component';
import { HearingAssignTerritoriesPageComponent } from './pages/hearing-assign-territories-page/hearing-assign-territories-page.component';

@NgModule({
  declarations: [HearingTerritoriesPageComponent, HearingAssignTerritoriesPageComponent],
  imports: [HearingTerritoryRoutesModule, CommonModule, SharedModule],
})
export class HearingTerritoryModule {}
