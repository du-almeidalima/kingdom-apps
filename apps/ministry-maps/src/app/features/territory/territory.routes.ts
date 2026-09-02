import { Route } from '@angular/router';

import { TerritoryAlertsBO } from './bo/territory-alerts/territory-alerts.bo';
import { TerritoryBO } from './bo/territory/territory.bo';
import { TerritoryStatisticsBO } from './bo/territory-statistics/territory-statistics.bo';
import { AssignTerritoriesPageComponent } from './pages/assign-territories-page/assign-territories-page.component';
import { StatisticsTerritoriesPageComponent } from './pages/statistics-territories-page/statistics-territories-page.component';
import { TerritoriesPageComponent } from './pages/territories-page/territories-page.component';
import { TerritoryRoutesEnum } from './models/enums/territory-routes';

export const TERRITORY_ROUTES: Route[] = [
  {
    path: '',
    providers: [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO],
    children: [
      {
        path: TerritoryRoutesEnum.LIST,
        component: TerritoriesPageComponent,
      },
      {
        path: TerritoryRoutesEnum.ASSIGN_TERRITORIES,
        component: AssignTerritoriesPageComponent,
      },
      {
        path: TerritoryRoutesEnum.STATISTICS,
        component: StatisticsTerritoriesPageComponent,
      },
    ],
  },
];
