import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom, of, throwError } from 'rxjs';

import { DesignationsHeaderBO } from './designations-header.bo';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { DesignationsHeaderRepository } from '../../../../repositories/designations-header.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { CongregationSettingsBO } from '../../../../core/features/congregation-settings/bo/congregation-settings.bo';
import {
  congregationMock,
  designationsHeaderMockBuilder,
  territoryMockBuilder,
  userMockBuilder,
} from '../../../../../test/mocks';
import { Territory } from '../../../../../models/territory';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Designation } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { DesignationsHeader } from '../../../../../models/designations-header';
import { DesignationsHeaderClosedByEnum } from '../../../../../models/enums/designations-header-closed-by';
import { DesignationsHeaderStatusEnum } from '../../../../../models/enums/designations-header-status';

const historyEntry = (id: string): TerritoryVisitHistory => ({
  id,
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: new Date(2024, 0, 1),
  notes: `visit ${id}`,
});

const activeHeader = designationsHeaderMockBuilder({ id: 'HEADER-ACTIVE' });

describe('DesignationsHeaderBO', () => {
  let bo: DesignationsHeaderBO;
  let territoryRepository: jest.Mocked<TerritoryRepository>;
  let designationRepository: jest.Mocked<DesignationRepository>;
  let designationsHeaderRepository: jest.Mocked<DesignationsHeaderRepository>;
  let userState: UserStateService;
  let loggerService: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DesignationsHeaderBO,
        CongregationSettingsBO,
        MockProvider(LoggerService),
        MockProvider(TerritoryRepository, {
          getAllInIds: jest.fn().mockReturnValue(of([])),
        }),
        MockProvider(DesignationRepository, {
          add: jest.fn().mockReturnValue(of({ id: 'DESIGNATION-NEW' } as Designation)),
          getStreamByHeaderId: jest.fn().mockReturnValue(of([])),
        }),
        MockProvider(DesignationsHeaderRepository, {
          getInProgressByCongregation: jest.fn().mockReturnValue(of(undefined)),
          getInProgressStreamByCongregation: jest.fn().mockReturnValue(of(undefined)),
          add: jest.fn().mockReturnValue(of(designationsHeaderMockBuilder({ id: 'HEADER-CREATED' }))),
          close: jest.fn().mockReturnValue(of(void 0)),
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

    bo = TestBed.inject(DesignationsHeaderBO);
    territoryRepository = TestBed.inject(TerritoryRepository) as jest.Mocked<TerritoryRepository>;
    designationRepository = TestBed.inject(DesignationRepository) as jest.Mocked<DesignationRepository>;
    designationsHeaderRepository = TestBed.inject(
      DesignationsHeaderRepository,
    ) as jest.Mocked<DesignationsHeaderRepository>;
    userState = TestBed.inject(UserStateService);
    loggerService = TestBed.inject(LoggerService);
  });

  describe('createDesignation', () => {
    it.each([
      ['no user', null],
      ['user without congregation', userMockBuilder({ congregation: undefined })],
    ])('completes without emitting or hitting repositories when there is %s', (_desc, user) => {
      userState.setUser(user);

      let completed = false;
      const emitted: unknown[] = [];
      bo.createDesignation(['T1'], activeHeader).subscribe({
        next: (value) => emitted.push(value),
        complete: () => (completed = true),
      });

      expect(emitted).toEqual([]);
      expect(completed).toBe(true);
      expect(territoryRepository.getAllInIds).not.toHaveBeenCalled();
      expect(designationRepository.add).not.toHaveBeenCalled();
      expect(designationsHeaderRepository.add).not.toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('completes without emitting for an empty list of territory ids', () => {
      let completed = false;
      const emitted: unknown[] = [];
      bo.createDesignation([], activeHeader).subscribe({
        next: (value) => emitted.push(value),
        complete: () => (completed = true),
      });

      expect(emitted).toEqual([]);
      expect(completed).toBe(true);
      expect(territoryRepository.getAllInIds).not.toHaveBeenCalled();
    });

    describe('header handling', () => {
      it('reuses the provided in-memory header without any header read or write', async () => {
        territoryRepository.getAllInIds.mockReturnValue(of([territoryMockBuilder({ id: 'T1' })]));

        const result = await lastValueFrom(bo.createDesignation(['T1'], activeHeader));

        expect(result.header).toBe(activeHeader);
        expect(designationsHeaderRepository.getInProgressByCongregation).not.toHaveBeenCalled();
        expect(designationsHeaderRepository.add).not.toHaveBeenCalled();
        expect(designationRepository.add.mock.calls[0][0].designationHeaderId).toBe(activeHeader.id);
      });

      it('creates a new header when none is active in memory nor in Firestore', async () => {
        const createdHeader = designationsHeaderMockBuilder({ id: 'HEADER-CREATED' });
        designationsHeaderRepository.getInProgressByCongregation.mockReturnValue(of(undefined));
        designationsHeaderRepository.add.mockReturnValue(of(createdHeader));
        territoryRepository.getAllInIds.mockReturnValue(of([territoryMockBuilder({ id: 'T1' })]));

        const result = await lastValueFrom(bo.createDesignation(['T1'], null));

        expect(designationsHeaderRepository.getInProgressByCongregation).toHaveBeenCalledWith(congregationMock.id);
        expect(designationsHeaderRepository.add).toHaveBeenCalledWith({
          congregationId: congregationMock.id,
          status: DesignationsHeaderStatusEnum.IN_PROGRESS,
          createdAt: expect.any(Date),
          createdBy: userMockBuilder({}).id,
        });
        expect(result.header).toBe(createdHeader);
        expect(designationRepository.add.mock.calls[0][0].designationHeaderId).toBe('HEADER-CREATED');
      });

      it('reuses the in-progress header found in Firestore when none is in memory', async () => {
        const existingHeader = designationsHeaderMockBuilder({ id: 'HEADER-EXISTING' });
        designationsHeaderRepository.getInProgressByCongregation.mockReturnValue(of(existingHeader));
        territoryRepository.getAllInIds.mockReturnValue(of([territoryMockBuilder({ id: 'T1' })]));

        const result = await lastValueFrom(bo.createDesignation(['T1'], null));

        expect(designationsHeaderRepository.add).not.toHaveBeenCalled();
        expect(result.header).toBe(existingHeader);
        expect(designationRepository.add.mock.calls[0][0].designationHeaderId).toBe('HEADER-EXISTING');
      });
    });

    describe('batching', () => {
      it('fetches all ids in a single repository call for up to 10 ids', async () => {
        territoryRepository.getAllInIds.mockReturnValue(of([]));

        await lastValueFrom(bo.createDesignation(['T1', 'T2', 'T3'], activeHeader));

        expect(territoryRepository.getAllInIds).toHaveBeenCalledTimes(1);
        expect(territoryRepository.getAllInIds).toHaveBeenCalledWith(['T1', 'T2', 'T3']);
      });

      it('splits ids into batches of 10 for more than 10 ids and flattens the results in order', async () => {
        const ids = Array.from({ length: 11 }, (_, i) => `T${i + 1}`);
        const fetched: Territory[] = ids.map((id) => territoryMockBuilder({ id }));
        territoryRepository.getAllInIds
          .mockReturnValueOnce(of(fetched.slice(0, 10)))
          .mockReturnValueOnce(of(fetched.slice(10)));

        await lastValueFrom(bo.createDesignation(ids, activeHeader));

        expect(territoryRepository.getAllInIds).toHaveBeenCalledTimes(2);
        expect(territoryRepository.getAllInIds.mock.calls[0][0]).toEqual(ids.slice(0, 10));
        expect(territoryRepository.getAllInIds.mock.calls[1][0]).toEqual(ids.slice(10));

        const persisted = designationRepository.add.mock.calls[0][0];
        expect(persisted.territories.map((t) => t.id)).toEqual(ids);
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

        const result = await lastValueFrom(bo.createDesignation(['T1', 'T2'], activeHeader));

        expect(result.designation.id).toBe('DESIGNATION-NEW');

        const persisted = designationRepository.add.mock.calls[0][0];
        expect(persisted.congregationId).toBe(congregationMock.id);
        expect(persisted.createdBy).toBe(userMockBuilder({}).id);
        expect(persisted.createdAt).toEqual(new Date(2024, 5, 15, 12, 0, 0));
        expect(persisted.expiresAt).toEqual(
          new Date(new Date(2024, 5, 15, 12, 0, 0).getTime() + 45 * 24 * 60 * 60 * 1000),
        );
        expect(persisted.settings).toEqual({ shouldDesignationBlockAfterExpired: false });
        expect(persisted.territories.every((t) => t.status === DesignationStatusEnum.PENDING)).toBe(true);
      });

      it('strips recentHistory and keeps only the last 5 history entries per territory', async () => {
        const fullHistory = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'].map(historyEntry);
        const territories = [territoryMockBuilder({ id: 'T1', history: fullHistory })];
        territoryRepository.getAllInIds.mockReturnValue(of(territories));

        await lastValueFrom(bo.createDesignation(['T1'], activeHeader));

        const persistedTerritory = designationRepository.add.mock.calls[0][0].territories[0];
        expect('recentHistory' in persistedTerritory).toBe(false);
        expect(persistedTerritory.history?.map((h) => h.id)).toEqual(['H3', 'H4', 'H5', 'H6', 'H7']);
      });

      it('defaults history to an empty array when the territory has none', async () => {
        const noHistory = territoryMockBuilder({ id: 'T1' }) as Territory;
        delete noHistory.history;
        territoryRepository.getAllInIds.mockReturnValue(of([noHistory]));

        await lastValueFrom(bo.createDesignation(['T1'], activeHeader));

        const persistedTerritory = designationRepository.add.mock.calls[0][0].territories[0];
        expect(persistedTerritory.history).toEqual([]);
      });
    });

    it('logs repository errors and rethrows them for callers', async () => {
      territoryRepository.getAllInIds.mockReturnValue(throwError(() => new Error('Firestore unavailable')));

      let errorCaught: Error | null = null;
      bo.createDesignation(['T1'], activeHeader).subscribe({
        next: () => fail('Should not emit next'),
        error: (err) => (errorCaught = err),
      });

      expect(errorCaught).toEqual(expect.objectContaining({ message: 'Firestore unavailable' }));
      expect(designationRepository.add).not.toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Firestore unavailable' }));
    });
  });

  describe('closeHeader', () => {
    it('closes the header as USER and logs the audit trail', async () => {
      await lastValueFrom(bo.closeHeader('HEADER-1'));

      expect(designationsHeaderRepository.close).toHaveBeenCalledWith('HEADER-1', DesignationsHeaderClosedByEnum.USER);
      expect(loggerService.info).toHaveBeenCalledWith(expect.stringContaining('closed Designations Header [HEADER-1]'));
    });
  });

  describe('getActiveSessionStream', () => {
    it('emits an empty session when stream emits no in-progress header', async () => {
      designationsHeaderRepository.getInProgressStreamByCongregation.mockReturnValue(of(undefined));

      const result = await lastValueFrom(bo.getActiveSessionStream(congregationMock.id));

      expect(result).toEqual({ header: null, designations: [] });
      expect(designationRepository.getStreamByHeaderId).not.toHaveBeenCalled();
    });

    it('streams header and designations in real time when header is in progress', async () => {
      const header: DesignationsHeader = designationsHeaderMockBuilder({ id: 'HEADER-1' });
      const designations = [{ id: 'D1' } as Designation, { id: 'D2' } as Designation];
      designationsHeaderRepository.getInProgressStreamByCongregation.mockReturnValue(of(header));
      designationRepository.getStreamByHeaderId.mockReturnValue(of(designations));

      const result = await lastValueFrom(bo.getActiveSessionStream(congregationMock.id));

      expect(designationRepository.getStreamByHeaderId).toHaveBeenCalledWith('HEADER-1');
      expect(result).toEqual({ header, designations });
    });
  });
});
