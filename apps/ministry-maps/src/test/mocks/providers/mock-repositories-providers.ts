import { UserRepositoryMock } from '../models/user.mock';
import { CongregationRepositoryMock } from '../models/congregation.mock';
import { DesignationRepositoryMock } from '../models/designation.mock';
import { TerritoryRepositoryMock } from '../models/territory.mock';
import { DesignationRepository } from '../../../app/repositories/designation.repository';
import { TerritoryRepository } from '../../../app/repositories/territories.repository';
import { CongregationRepository } from '../../../app/repositories/congregation.repository';
import { UserRepository } from '../../../app/repositories/user.repository';
import { InvitationLinkRepository } from '../../../app/repositories/invitation-link.repository';
import { AuthRepositoryMock } from '../models/auth.mock';
import { AuthRepository } from '../../../app/repositories/auth.repository';
import { InvitationLinkRepositoryMock } from '../models/invitation-link.mock';

export const MOCK_REPOSITORIES_PROVIDERS = [
  {
    provide: UserRepository,
    useClass: UserRepositoryMock,
  },
  {
    provide: CongregationRepository,
    useClass: CongregationRepositoryMock,
  },
  {
    provide: TerritoryRepository,
    useClass: TerritoryRepositoryMock,
  },
  {
    provide: DesignationRepository,
    useClass: DesignationRepositoryMock,
  },
  // {
  //   provide: NoteRepository,
  //   useClass: NoteDatasourceService,
  // },
  {
    provide: InvitationLinkRepository,
    useClass: InvitationLinkRepositoryMock,
  },
  {
    provide: AuthRepository,
    useClass: AuthRepositoryMock,
  },
];
