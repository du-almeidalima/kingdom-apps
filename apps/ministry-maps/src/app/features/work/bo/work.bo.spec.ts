import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom, of, throwError } from 'rxjs';

import { WorkBO } from './work.bo';
import { TerritoryRepository } from '../../../repositories/territories.repository';
import { DesignationRepository } from '../../../repositories/designation.repository';
import { Designation, DesignationTerritory } from '../../../../models/designation';
import { DesignationStatusEnum } from '../../../../models/enums/designation-status';
import { Territory } from '../../../../models/territory';
import { TerritoryVisitHistory } from '../../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';
import { DesignationsProgressRepository } from '../../../repositories/designations-progress.repository';
import { LoggerService } from '../../../shared/services/logger/logger.service';

const historyEntry = (id: string, daysAgo: number): TerritoryVisitHistory => ({
  id,
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: new Date(2024, 0, 1 + daysAgo),
  notes: `visit ${id}`,
});

const designationTerritory = (partial: Partial<DesignationTerritory> = {}): DesignationTerritory => ({
  id: 'TERRITORY-1',
  congregationId: 'CONGREGATION-1',
  city: 'City 1',
  address: 'Main St 1',
  note: '',
  icon: 'm' as Territory['icon'],
  status: DesignationStatusEnum.DONE,
  history: [historyEntry('H1', 0), historyEntry('H2', 5)],
  lastVisit: new Date(2024, 0, 6),
  ...partial,
});

const designation = (territories: DesignationTerritory[] = [designationTerritory()], designationHeaderId?: string): Designation => ({
  id: 'DESIGNATION-1',
  congregationId: 'CONGREGATION-1',
  territories,
  createdAt: new Date(2024, 0, 1),
  createdBy: 'USER-1',
  expiresAt: new Date(2024, 1, 15),
  designationHeaderId,
});

describe('WorkBO', () => {
  let workBO: WorkBO;
  let territoryRepository: jest.Mocked<TerritoryRepository>;
  let designationRepository: jest.Mocked<DesignationRepository>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkBO,
        MockProvider(TerritoryRepository, {
          update: jest.fn().mockReturnValue(of(void 0)),
          deleteVisitHistory: jest.fn().mockReturnValue(of(void 0)),
        }),
        MockProvider(DesignationRepository, {
          update: jest.fn().mockReturnValue(of(void 0)),
        }),
        MockProvider(DesignationsProgressRepository, {
          setTerritoryProgress: jest.fn().mockReturnValue(of(void 0)),
          removeTerritoryProgress: jest.fn().mockReturnValue(of(void 0)),
        }),
        MockProvider(LoggerService),
      ],
    });

    workBO = TestBed.inject(WorkBO);
    territoryRepository = TestBed.inject(TerritoryRepository) as jest.Mocked<TerritoryRepository>;
    designationRepository = TestBed.inject(DesignationRepository) as jest.Mocked<DesignationRepository>;
  });

  describe('recordTerritoryProgress', () => {
    it('writes the latest completed visit', async () => {
      const item = designationTerritory();
      await lastValueFrom(workBO.recordTerritoryProgress(designation([item], 'HEADER-1'), item));
      expect(TestBed.inject(DesignationsProgressRepository).setTerritoryProgress).toHaveBeenCalledWith('HEADER-1', {
        designationId: 'DESIGNATION-1', territoryId: 'TERRITORY-1', outcome: VisitOutcomeEnum.SPOKE, completedAt: item.history?.at(-1)?.date,
      });
    });

    it.each([
      ['legacy designation', designation([designationTerritory()])],
      ['pending territory', designation([designationTerritory({ status: DesignationStatusEnum.PENDING })], 'HEADER-1')],
      ['missing history', designation([designationTerritory({ history: [] })], 'HEADER-1')],
    ])('skips the write for %s', async (_label, input) => {
      await lastValueFrom(workBO.recordTerritoryProgress(input, input.territories[0]));
      expect(TestBed.inject(DesignationsProgressRepository).setTerritoryProgress).not.toHaveBeenCalled();
    });

    it('swallows a failed progress write and logs a warning', async () => {
      jest.spyOn(TestBed.inject(DesignationsProgressRepository), 'setTerritoryProgress').mockReturnValue(throwError(() => new Error('missing')));
      const item = designationTerritory();
      await expect(lastValueFrom(workBO.recordTerritoryProgress(designation([item], 'HEADER-1'), item))).resolves.toBeUndefined();
      expect(TestBed.inject(LoggerService).warn).toHaveBeenCalled();
    });
  });

  describe('undoLastVisitChanges', () => {
    it('throws synchronously when the territory has no history', () => {
      expect(() => workBO.undoLastVisitChanges(designation(), designationTerritory({ history: [] }))).toThrow(
        "Territory don't have any history to undo.",
      );
    });

    it('throws synchronously when history is undefined', () => {
      const noHistory = designationTerritory({ history: undefined }) as DesignationTerritory;
      delete (noHistory as Partial<DesignationTerritory>).history;

      expect(() => workBO.undoLastVisitChanges(designation(), noHistory)).toThrow(
        "Territory don't have any history to undo.",
      );
      expect(designationRepository.update).not.toHaveBeenCalled();
    });

    it('removes the last history entry, resets status to PENDING and nullifies lastVisit for a single-entry history', async () => {
      const territory = designationTerritory({ history: [historyEntry('H1', 0)] });

      await lastValueFrom(workBO.undoLastVisitChanges(designation([territory]), territory));

      const designationArg = designationRepository.update.mock.calls[0][0];
      expect(designationArg.territories[0].status).toBe(DesignationStatusEnum.PENDING);
      expect(designationArg.territories[0].lastVisit).toBeNull();
      expect(designationArg.territories[0].history).toEqual([]);
    });

    it('restores lastVisit to the previous entry date for a multi-entry history', async () => {
      const territory = designationTerritory();

      await lastValueFrom(workBO.undoLastVisitChanges(designation([territory]), territory));

      const designationArg = designationRepository.update.mock.calls[0][0];
      expect(designationArg.territories[0].lastVisit).toEqual(new Date(2024, 0, 1));
      expect(designationArg.territories[0].history).toEqual([historyEntry('H1', 0)]);
    });

    it('deletes the removed history entry from the territory history collection', async () => {
      const territory = designationTerritory();

      await lastValueFrom(workBO.undoLastVisitChanges(designation([territory]), territory));

      expect(territoryRepository.deleteVisitHistory).toHaveBeenCalledWith('TERRITORY-1', 'H2');
    });

    it('removes progress on undo and swallows a failed progress removal', async () => {
      const territory = designationTerritory();
      const input = designation([territory], 'HEADER-1');
      await lastValueFrom(workBO.undoLastVisitChanges(input, territory));
      expect(TestBed.inject(DesignationsProgressRepository).removeTerritoryProgress).toHaveBeenCalledWith('HEADER-1', 'DESIGNATION-1', 'TERRITORY-1');
      jest.spyOn(TestBed.inject(DesignationsProgressRepository), 'removeTerritoryProgress').mockReturnValue(throwError(() => new Error('missing')));
      await expect(lastValueFrom(workBO.undoLastVisitChanges(input, territory))).resolves.toBeDefined();
    });

    it('skips progress removal for legacy designations', async () => {
      const territory = designationTerritory();
      await lastValueFrom(workBO.undoLastVisitChanges(designation([territory]), territory));
      expect(TestBed.inject(DesignationsProgressRepository).removeTerritoryProgress).not.toHaveBeenCalled();
    });

    it('saves the territory back without the designation status field', async () => {
      const territory = designationTerritory();

      await lastValueFrom(workBO.undoLastVisitChanges(designation([territory]), territory));

      const territoryArg = territoryRepository.update.mock.calls[0][0] as DesignationTerritory;
      expect('status' in territoryArg).toBe(false);
      expect(territoryArg.id).toBe('TERRITORY-1');
      expect(territoryArg.lastVisit).toEqual(new Date(2024, 0, 1));
    });

    it('does not mutate the input designation and territory', async () => {
      const territory = designationTerritory();
      const inputDesignation = designation([territory]);
      const designationSnapshot = structuredClone(inputDesignation);
      const territorySnapshot = structuredClone(territory);

      await lastValueFrom(workBO.undoLastVisitChanges(inputDesignation, territory));

      expect(territory).toEqual(territorySnapshot);
      expect(inputDesignation).toEqual(designationSnapshot);
    });
  });

  describe('updateDesignationTerritoryObject', () => {
    it('replaces the matching territory while preserving array order', () => {
      const t1 = designationTerritory({ id: 'T1' });
      const t2 = designationTerritory({ id: 'T2' });
      const t3 = designationTerritory({ id: 'T3' });
      const replacement = designationTerritory({ id: 'T2', lastVisit: new Date(2030, 0, 1) });

      const result = workBO.updateDesignationTerritoryObject(designation([t1, t2, t3]), replacement);

      expect(result.territories.map((t) => t.id)).toEqual(['T1', 'T2', 'T3']);
      expect(result.territories[1]).toEqual(replacement);
      expect(result.territories[0]).toEqual(t1);
    });

    it('keeps the designation intact when no territory matches', () => {
      const t1 = designationTerritory({ id: 'T1' });
      const unrelated = designationTerritory({ id: 'OTHER' });

      const result = workBO.updateDesignationTerritoryObject(designation([t1]), unrelated);

      expect(result.territories).toEqual([t1]);
    });

    it('does not mutate the input designation', () => {
      const t1 = designationTerritory({ id: 'T1' });
      const input = designation([t1]);
      const snapshot = structuredClone(input);

      workBO.updateDesignationTerritoryObject(input, designationTerritory({ id: 'T1', lastVisit: new Date() }));

      expect(input).toEqual(snapshot);
    });
  });
});
