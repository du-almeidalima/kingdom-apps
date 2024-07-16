import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CongregationRepository } from './congregation.repository';
import { DesignationRepository } from './designation.repository';
import { FirebaseCongregationDatasourceService } from './firebase/firebase-congregation-datasource.service';
import { FirebaseDesignationDatasourceService } from './firebase/firebase-designation-datasource.service';
import { FirebaseTerritoryDatasourceService } from './firebase/firebase-territory-datasource.service';
import { FirebaseUserDatasourceService } from './firebase/firebase-user-datasource.service';
import { TerritoryRepository } from './territories.repository';
import { UserRepository } from './user.repository';
import { HearingDesignationRepository } from './hearing-designation.repository';
import {
  FirebaseHearingDesignationDatasourceService
} from './firebase/firebase-hearing-designation-datasource.service';
import { HearingTerritoryRepository } from './hearing-territory.repository';
import { FirebaseHearingTerritoryDatasourceService } from './firebase/firebase-hearing-territory-datasource.service';

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
    {
      provide: DesignationRepository,
      useClass: FirebaseDesignationDatasourceService,
    },
    {
      provide: HearingDesignationRepository,
      useClass: FirebaseHearingDesignationDatasourceService,
    },
    {
      provide: HearingTerritoryRepository,
      useClass: FirebaseHearingTerritoryDatasourceService,
    },
    // {
    //   provide: NoteRepository,
    //   useClass: NoteDatasourceService,
    // },
  ],
})
export class RepositoriesModule {}
