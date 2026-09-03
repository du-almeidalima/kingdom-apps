import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom, of } from 'rxjs';

import { TerritoryBO } from './territory.bo';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { congregationMock, userMockBuilder } from '../../../../../test/mocks';

describe('TerritoryBO', () => {
  let territoryBO: TerritoryBO;
  let territoryRepository: jest.Mocked<TerritoryRepository>;
  let loggerService: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerritoryBO,
        MockProvider(LoggerService),
        MockProvider(TerritoryRepository, {
          delete: jest.fn().mockReturnValue(of(void 0)),
        }),
        {
          provide: UserStateService,
          useFactory: () => {
            const userStateServiceMock = new UserStateService();
            userStateServiceMock.setUser(userMockBuilder({ congregation: congregationMock }));

            return userStateServiceMock;
          },
        },
      ],
    });

    territoryBO = TestBed.inject(TerritoryBO);
    territoryRepository = TestBed.inject(TerritoryRepository) as jest.Mocked<TerritoryRepository>;
    loggerService = TestBed.inject(LoggerService);
  });

  describe('deleteTerritory', () => {
    it('delegates to the repository and logs the congregation context on success', async () => {
      await lastValueFrom(territoryBO.deleteTerritory('T1'));

      expect(territoryRepository.delete).toHaveBeenCalledWith('T1');
      expect(loggerService.info).toHaveBeenCalledWith(expect.stringContaining('deleted Territory [T1]'));
      expect(loggerService.info).toHaveBeenCalledWith(expect.stringContaining(congregationMock.id));
    });
  });
});
