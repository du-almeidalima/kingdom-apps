import { NgModule } from '@angular/core';
import { TerritoryRoutesModule } from './territory-routes.module';
import { TerritoryAlertsBO } from './bo/territory-alerts.bo';
import { TerritoryBO } from './bo/territory.bo';
import { TerritoryStatisticsBO } from './bo/territory-statistics.bo';

@NgModule({
  imports: [TerritoryRoutesModule],
  providers: [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO]
})
export class TerritoryModule {}
