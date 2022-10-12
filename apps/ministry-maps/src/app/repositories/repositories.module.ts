import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRepository } from './user.repository';
import { FirebaseUserDatasourceService } from './firebase/firebase-user-datasource.service';
import { CongregationRepository } from './congregation.repository';
import { FirebaseCongregationDatasourceService } from './firebase/firebase-congregation-datasource.service';
import { TerritoryRepository } from './territories.repository';
import { FirebaseTerritoryDatasourceService } from './firebase/firebase-territory-datasource.service';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    {
      provide: UserRepository,
      useClass: FirebaseUserDatasourceService,
    },
    {
      provide: CongregationRepository,
      useClass: FirebaseCongregationDatasourceService,
    },
    {
      provide: TerritoryRepository,
      useClass: FirebaseTerritoryDatasourceService,
    },
  ],
})
export class RepositoriesModule {}