import { MockService, ngMocks } from 'ng-mocks';
import { UserStateService } from '../app/state/user.state.service';
import {
  AuthRepositoryMock,
  CongregationRepositoryMock,
  DesignationRepositoryMock,
  DesignationsHeaderRepositoryMock,
  InvitationLinkRepositoryMock,
  organizerUserStateServiceMock,
  TerritoryRepositoryMock,
  UserRepositoryMock,
} from './mocks';
import { CongregationRepository } from '../app/repositories/congregation.repository';
import { DefaultTitleStrategy, TitleStrategy } from '@angular/router';

import { TerritoryRepository } from '../app/repositories/territories.repository';
import { AuthRepository } from '../app/repositories/auth.repository';
import { DesignationRepository } from '../app/repositories/designation.repository';
import { DesignationsHeaderRepository } from '../app/repositories/designations-header.repository';
import { UserRepository } from '../app/repositories/user.repository';
import { InvitationLinkRepository } from '../app/repositories/invitation-link.repository';
import { CityLocatorService } from '../app/shared/services/city-locator/city-locator.service';
import { signal } from '@angular/core';

// auto spy
ngMocks.autoSpy('jest');

ngMocks.defaultMock([TitleStrategy], () => MockService(DefaultTitleStrategy));
ngMocks.defaultMock([UserStateService], () => organizerUserStateServiceMock);
ngMocks.defaultMock([CityLocatorService], () => ({
  isLoading: signal(false),
  resolvedCity: signal<string | null>('City 1'),
}));
ngMocks.defaultMock([UserRepository], () => new UserRepositoryMock());
ngMocks.defaultMock([CongregationRepository], () => new CongregationRepositoryMock());
ngMocks.defaultMock([TerritoryRepository], () => new TerritoryRepositoryMock());
ngMocks.defaultMock([AuthRepository], () => new AuthRepositoryMock());
ngMocks.defaultMock([DesignationRepository], () => new DesignationRepositoryMock());
ngMocks.defaultMock([DesignationsHeaderRepository], () => new DesignationsHeaderRepositoryMock());
ngMocks.defaultMock([InvitationLinkRepository], () => new InvitationLinkRepositoryMock());
