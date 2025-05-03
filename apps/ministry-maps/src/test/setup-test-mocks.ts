import { MockService, ngMocks } from 'ng-mocks';
import { UserStateService } from '../app/state/user.state.service';
import { CongregationRepositoryMock, organizerUserStateServiceMock, UserRepositoryMock } from './mocks';
import { CongregationRepository } from '../app/repositories/congregation.repository';
import { DefaultTitleStrategy, TitleStrategy } from '@angular/router';

import { TerritoryRepository } from '../app/repositories/territories.repository';
import { TerritoryRepositoryMock } from './mocks/models/territory.mock';
import { AuthRepository } from '../app/repositories/auth.repository';
import { AuthRepositoryMock } from './mocks/models/auth.mock';
import { DesignationRepository } from '../app/repositories/designation.repository';
import { DesignationRepositoryMock } from './mocks/models/designation.mock';
import { UserRepository } from '../app/repositories/user.repository';
import { InvitationLinkRepositoryMock } from './mocks/models/invitation-link.mock';

// auto spy
ngMocks.autoSpy('jest');

ngMocks.defaultMock(TitleStrategy, () => MockService(DefaultTitleStrategy));
ngMocks.defaultMock(UserStateService, () => organizerUserStateServiceMock);
ngMocks.defaultMock(UserRepository, () => new UserRepositoryMock());
ngMocks.defaultMock(CongregationRepository, () => new CongregationRepositoryMock());
ngMocks.defaultMock(TerritoryRepository, () => new TerritoryRepositoryMock());
ngMocks.defaultMock(AuthRepository, () => new AuthRepositoryMock());
ngMocks.defaultMock(DesignationRepository, () => new DesignationRepositoryMock());
ngMocks.defaultMock(InvitationLinkRepositoryMock, () => new InvitationLinkRepositoryMock());

