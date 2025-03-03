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
import { AuthRepository } from './auth.repository';
import { FirebaseAuthDatasourceService } from './firebase/firebase-auth-datasource.service';

export const REPOSITORIES_PROVIDERS = [
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
  {
    provide: AuthRepository,
    useClass: FirebaseAuthDatasourceService,
  },
];
