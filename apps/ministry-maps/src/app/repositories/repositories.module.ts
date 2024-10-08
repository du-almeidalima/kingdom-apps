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
import { InvitationLinkRepository } from './invitation-link.repository';
import { FirebaseInvitationLinkDataSourceService } from './firebase/firebase-invitation-link-datasource.service';

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
    // {
    //   provide: NoteRepository,
    //   useClass: NoteDatasourceService,
    // },
    {
      provide: InvitationLinkRepository,
      useClass: FirebaseInvitationLinkDataSourceService,
    },
  ],
})
export class RepositoriesModule {}
