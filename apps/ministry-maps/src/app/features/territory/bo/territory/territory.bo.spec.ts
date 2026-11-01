import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom, of } from 'rxjs';

import { TerritoryBO } from './territory.bo';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { congregationMock, userMockBuilder } from '../../../../../test/mocks';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';

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
          update: jest.fn().mockReturnValue(of(void 0)),
          batchUpdate: jest.fn().mockReturnValue(of(void 0)),
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
      expect(loggerService.info).toHaveBeenCalledWith(
        expect.stringContaining('deleted Territory [T1]'),
        {
          userId: 'ORG123',
          userEmail: 'org.user@email.com',
          congregationId: congregationMock.id,
        },
      );
    });
  });

  describe('updateTerritory', () => {
    it('delegates to the repository and logs the congregation context on success', async () => {
      const territory = territoryMockBuilder({ id: 'T1' });
      await lastValueFrom(territoryBO.updateTerritory(territory));

      expect(territoryRepository.update).toHaveBeenCalledWith(territory);
      expect(loggerService.info).toHaveBeenCalledWith(
        expect.stringContaining('updated Territory [T1]'),
        {
          userId: 'ORG123',
          userEmail: 'org.user@email.com',
          congregationId: congregationMock.id,
        },
      );
    });
  });

  describe('batchUpdateTerritories', () => {
    it('delegates to the repository and logs the congregation context on success', async () => {
      const t1 = territoryMockBuilder({ id: 'T1' });
      const t2 = territoryMockBuilder({ id: 'T2' });
      await lastValueFrom(territoryBO.batchUpdateTerritories([t1, t2]));

      expect(territoryRepository.batchUpdate).toHaveBeenCalledWith([t1, t2]);
      expect(loggerService.info).toHaveBeenCalledWith(
        expect.stringContaining('batch updated 2 territories'),
        {
          userId: 'ORG123',
          userEmail: 'org.user@email.com',
          congregationId: congregationMock.id,
        },
      );
    });

    it('returns without calling repository or logging when array is empty', async () => {
      await lastValueFrom(territoryBO.batchUpdateTerritories([]));

      expect(territoryRepository.batchUpdate).not.toHaveBeenCalled();
      expect(loggerService.info).not.toHaveBeenCalled();
    });
  });
});
