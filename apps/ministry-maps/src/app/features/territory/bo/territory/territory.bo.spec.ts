import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom, of, throwError } from 'rxjs';

import { TerritoryBO } from './territory.bo';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { CongregationSettingsBO } from '../../../../core/features/congregation-settings/bo/congregation-settings.bo';
import { congregationMock, territoryMockBuilder, userMockBuilder } from '../../../../../test/mocks';
import { Territory } from '../../../../../models/territory';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Designation } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';

const historyEntry = (id: string): TerritoryVisitHistory => ({
  id,
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: new Date(2024, 0, 1),
  notes: `visit ${id}`,
});

describe('TerritoryBO', () => {
  let territoryBO: TerritoryBO;
  let territoryRepository: jest.Mocked<TerritoryRepository>;
  let designationRepository: jest.Mocked<DesignationRepository>;
  let userState: UserStateService;
  let loggerService: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerritoryBO,
        CongregationSettingsBO,
        MockProvider(LoggerService),
        MockProvider(TerritoryRepository, {
          getAllInIds: jest.fn().mockReturnValue(of([])),
          delete: jest.fn().mockReturnValue(of(void 0)),
        }),
        MockProvider(DesignationRepository, {
          add: jest.fn().mockReturnValue(of({ id: 'DESIGNATION-NEW' } as Designation)),
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
    designationRepository = TestBed.inject(DesignationRepository) as jest.Mocked<DesignationRepository>;
    userState = TestBed.inject(UserStateService);
    loggerService = TestBed.inject(LoggerService);
  });

  describe('createDesignationForTerritories', () => it.each([
    ['no user', null],
    ['user without congregation', userMockBuilder({ congregation: undefined })],
  ])('completes without emitting or hitting repositories when there is %s', (_desc, user) => {
    userState.setUser(user);

    let completed = false;
    const emitted: unknown[] = [];
    territoryBO.createDesignationForTerritories(['T1']).subscribe({
      next: value => emitted.push(value),
      complete: () => (completed = true),
    });

    expect(emitted).toEqual([]);
    expect(completed).toBe(true);
    expect(territoryRepository.getAllInIds).not.toHaveBeenCalled();
    expect(designationRepository.add).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalled();
  }));

  it('completes without emitting for an empty list of territory ids', () => {
    let completed = false;
    const emitted: unknown[] = [];
    territoryBO.createDesignationForTerritories([]).subscribe({
      next: value => emitted.push(value),
      complete: () => (completed = true),
    });

    expect(emitted).toEqual([]);
    expect(completed).toBe(true);
    expect(territoryRepository.getAllInIds).not.toHaveBeenCalled();
  });

  describe('batching', () => {
    it('fetches all ids in a single repository call for up to 10 ids', async () => {
      territoryRepository.getAllInIds.mockReturnValue(of([]));

      await lastValueFrom(territoryBO.createDesignationForTerritories(['T1', 'T2', 'T3']));

      expect(territoryRepository.getAllInIds).toHaveBeenCalledTimes(1);
      expect(territoryRepository.getAllInIds).toHaveBeenCalledWith(['T1', 'T2', 'T3']);
    });

    it('splits ids into batches of 10 for more than 10 ids and flattens the results in order', async () => {
      const ids = Array.from({ length: 11 }, (_, i) => `T${i + 1}`);
      const fetched: Territory[] = ids.map(id => territoryMockBuilder({ id }));
      territoryRepository.getAllInIds
        .mockReturnValueOnce(of(fetched.slice(0, 10)))
        .mockReturnValueOnce(of(fetched.slice(10)));

      await lastValueFrom(territoryBO.createDesignationForTerritories(ids));

      expect(territoryRepository.getAllInIds).toHaveBeenCalledTimes(2);
      expect(territoryRepository.getAllInIds.mock.calls[0][0]).toEqual(ids.slice(0, 10));
      expect(territoryRepository.getAllInIds.mock.calls[1][0]).toEqual(ids.slice(10));

      const persisted = designationRepository.add.mock.calls[0][0];
      expect(persisted.territories.map(t => t.id)).toEqual(ids);
    });
  });

  describe('designation payload', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('builds the designation with congregation/user context, 45-day default expiry and pending territories', async () => {
      const territories = [territoryMockBuilder({ id: 'T1' }), territoryMockBuilder({ id: 'T2' })];
      territoryRepository.getAllInIds.mockReturnValue(of(territories));

      const result = await lastValueFrom(territoryBO.createDesignationForTerritories(['T1', 'T2']));

      expect(result?.id).toBe('DESIGNATION-NEW');

      const persisted = designationRepository.add.mock.calls[0][0];
      expect(persisted.congregationId).toBe(congregationMock.id);
      expect(persisted.createdBy).toBe(userMockBuilder({}).id);
      expect(persisted.createdAt).toEqual(new Date(2024, 5, 15, 12, 0, 0));
      expect(persisted.expiresAt).toEqual(new Date(new Date(2024, 5, 15, 12, 0, 0).getTime() + 45 * 24 * 60 * 60 * 1000));
      expect(persisted.settings).toEqual({ shouldDesignationBlockAfterExpired: false });
      expect(persisted.territories.every(t => t.status === DesignationStatusEnum.PENDING)).toBe(true);
    });

    it('strips recentHistory and keeps only the last 5 history entries per territory', async () => {
      const fullHistory = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'].map(historyEntry);
      const territories = [territoryMockBuilder({ id: 'T1', history: fullHistory })];
      territoryRepository.getAllInIds.mockReturnValue(of(territories));

      await lastValueFrom(territoryBO.createDesignationForTerritories(['T1']));

      const persistedTerritory = designationRepository.add.mock.calls[0][0].territories[0];
      expect('recentHistory' in persistedTerritory).toBe(false);
      expect(persistedTerritory.history?.map(h => h.id)).toEqual(['H3', 'H4', 'H5', 'H6', 'H7']);
    });

    it('defaults history to an empty array when the territory has none', async () => {
      const noHistory = territoryMockBuilder({ id: 'T1' }) as Territory;
      delete noHistory.history;
      territoryRepository.getAllInIds.mockReturnValue(of([noHistory]));

      await lastValueFrom(territoryBO.createDesignationForTerritories(['T1']));

      const persistedTerritory = designationRepository.add.mock.calls[0][0].territories[0];
      expect(persistedTerritory.history).toEqual([]);
    });
  });

  it('swallows repository errors and logs them', async () => {
    territoryRepository.getAllInIds.mockReturnValue(throwError(() => new Error('Firestore unavailable')));

    let completed = false;
    const emitted: unknown[] = [];
    territoryBO.createDesignationForTerritories(['T1']).subscribe({
      next: value => emitted.push(value),
      complete: () => (completed = true),
    });

    expect(emitted).toEqual([]);
    expect(completed).toBe(true);
    expect(designationRepository.add).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Firestore unavailable' }));
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
