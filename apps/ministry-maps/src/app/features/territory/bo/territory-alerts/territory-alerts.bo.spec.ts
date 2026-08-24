import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';

import { TerritoryAlertsBO } from './territory-alerts.bo';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { territoryMockBuilder } from '../../../../../test/mocks';
import { Territory } from '../../../../../models/territory';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';

const historyEntry = (partial: Partial<TerritoryVisitHistory> = {}): TerritoryVisitHistory => ({
  id: 'HISTORY-1',
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: new Date(2024, 0, 10),
  notes: 'a visit',
  ...partial,
});

const territory = (partial: Partial<Territory> = {}) =>
  territoryMockBuilder({
    recentHistory: [],
    ...partial,
  });

describe('TerritoryAlertsBO (static helpers)', () => {
  describe('hasRecentRevisit', () => {
    it('is true when any recent history entry is a revisit', () => {
      expect(
        TerritoryAlertsBO.hasRecentRevisit(territory({ recentHistory: [historyEntry({ isRevisit: true })] })),
      ).toBe(true);
    });

    it.each([
      ['no revisit entries', [historyEntry({ isRevisit: false })]],
      ['no recent history', undefined],
    ])('is false when there are %s', (_desc, recentHistory) => {
      expect(TerritoryAlertsBO.hasRecentRevisit(territory({ recentHistory }))).toBe(false);
    });
  });

  describe('hasRecentlyMoved', () => {
    it.each([
      ['an unresolved MOVED entry', [historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED })], true],
      ['a resolved MOVED entry', [historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED, isResolved: true })], false],
      ['only non-moved entries', [historyEntry({ visitOutcome: VisitOutcomeEnum.SPOKE })], false],
      ['no recent history', undefined, false],
    ])('is %p when the territory has %s', (_desc, recentHistory, expected) => {
      expect(TerritoryAlertsBO.hasRecentlyMoved(territory({ recentHistory }))).toBe(expected);
    });
  });

  describe('hasRecentlyAskedToStopVisiting', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 5, 15));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const monthsAgo = (months: number) => new Date(2024, 5 - months, 15);

    it.each([
      [
        'asked 3 months ago (unresolved)',
        historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: monthsAgo(3) }),
        true,
      ],
      [
        'asked 23 months ago (unresolved)',
        historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: monthsAgo(23) }),
        true,
      ],
      [
        'asked exactly 24 months ago (window boundary)',
        historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: monthsAgo(24) }),
        false,
      ],
      [
        'asked more than 24 months ago',
        historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: monthsAgo(30) }),
        false,
      ],
      [
        'asked but already resolved',
        historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, isResolved: true, date: monthsAgo(3) }),
        false,
      ],
      // differenceInMonths clamps future dates to 0, so future-dated reports stay flagged.
      [
        'asked with a future date',
        historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: new Date(2025, 5, 15) }),
        true,
      ],
      [
        'entry without a date',
        historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: undefined as unknown as Date }),
        false,
      ],
    ])('is %p for %s', (_desc, entry, expected) => {
      expect(TerritoryAlertsBO.hasRecentlyAskedToStopVisiting(territory({ recentHistory: [entry] }))).toBe(expected);
    });
  });

  describe('isBibleStudent', () => {
    it.each([
      ['true', true],
      ['false', false],
      ['undefined', undefined],
    ])('returns the coerced boolean for %s', (_desc, value) => {
      expect(TerritoryAlertsBO.isBibleStudent(territory({ isBibleStudent: value }))).toBe(!!value);
    });
  });

  describe('findImportantAlert', () => {
    it('prioritizes MOVED over ASKED_TO_NOT_VISIT_AGAIN when both are unresolved', () => {
      const bothAlerts = territory({
        recentHistory: [
          historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED }),
          historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: new Date() }),
        ],
      });

      expect(TerritoryAlertsBO.findImportantAlert(bothAlerts)).toBe(VisitOutcomeEnum.MOVED);
    });

    it('returns ASKED_TO_NOT_VISIT_AGAIN when it is the only unresolved alert', () => {
      const stopVisiting = territory({
        recentHistory: [historyEntry({ visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN, date: new Date() })],
      });

      expect(TerritoryAlertsBO.findImportantAlert(stopVisiting)).toBe(VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN);
    });

    it('returns null when all alerts are resolved or absent', () => {
      expect(
        TerritoryAlertsBO.findImportantAlert(
          territory({ recentHistory: [historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED, isResolved: true })] }),
        ),
      ).toBeNull();
      expect(TerritoryAlertsBO.findImportantAlert(territory())).toBeNull();
    });
  });

  describe('alertMessaging', () => {
    it('maps ASKED_TO_NOT_VISIT_AGAIN to its pt-BR messaging', () => {
      expect(TerritoryAlertsBO.alertMessaging(VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN).title).toBe('Não visitar');
    });

    it('maps MOVED to its pt-BR messaging', () => {
      expect(TerritoryAlertsBO.alertMessaging(VisitOutcomeEnum.MOVED).title).toBe('Se Mudou');
    });

    it('falls back to an unmapped-alert message for anything else', () => {
      expect(TerritoryAlertsBO.alertMessaging(VisitOutcomeEnum.SPOKE)).toEqual({
        title: 'Alerta Não Mapeado',
        bodyText: `Por favor, desconsidere esse aviso.`,
      });
    });
  });
});

describe('TerritoryAlertsBO.resolveTerritoryHistoryAlert', () => {
  let bo: TerritoryAlertsBO;
  let territoryRepository: jest.Mocked<TerritoryRepository>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerritoryAlertsBO,
        MockProvider(TerritoryRepository, {
          update: jest.fn().mockReturnValue(of(undefined) as never),
          setVisitHistory: jest.fn().mockReturnValue(of(undefined) as never),
        }),
      ],
    });

    bo = TestBed.inject(TerritoryAlertsBO);
    territoryRepository = TestBed.inject(TerritoryRepository) as jest.Mocked<TerritoryRepository>;
  });

  it('marks only the entries matching the outcome as resolved in the history collection', () => {
    const movedEntry = historyEntry({ id: 'H-MOVED', visitOutcome: VisitOutcomeEnum.MOVED });
    const spokeEntry = historyEntry({ id: 'H-SPOKE', visitOutcome: VisitOutcomeEnum.SPOKE });
    const input = territory({ recentHistory: [movedEntry, spokeEntry] });

    bo.resolveTerritoryHistoryAlert(input, [movedEntry, spokeEntry], VisitOutcomeEnum.MOVED).subscribe();

    const savedIds = territoryRepository.setVisitHistory.mock.calls.map((call) => call[1].id);
    expect(savedIds).toEqual(['H-MOVED', 'H-SPOKE']);
    const savedMoved = territoryRepository.setVisitHistory.mock.calls[0][1];
    const savedSpoke = territoryRepository.setVisitHistory.mock.calls[1][1];
    expect(savedMoved.isResolved).toBe(true);
    expect(savedSpoke.isResolved).toBeUndefined();
  });

  it('clears the isRevisit flag on revisit entries when resolving the REVISIT outcome', () => {
    const revisitEntry = historyEntry({ id: 'H-REVISIT', isRevisit: true });

    bo.resolveTerritoryHistoryAlert(
      territory({ recentHistory: [revisitEntry] }),
      [revisitEntry],
      VisitOutcomeEnum.REVISIT,
    ).subscribe();

    const saved = territoryRepository.setVisitHistory.mock.calls[0][1];
    expect(saved.isRevisit).toBe(false);
    expect(saved.isResolved).toBeUndefined();
  });

  it('updates the territory document first, then each history entry (concat order)', () => {
    const entry = historyEntry({ id: 'H1' });

    bo.resolveTerritoryHistoryAlert(territory({ recentHistory: [entry] }), [entry], VisitOutcomeEnum.MOVED).subscribe();

    expect(territoryRepository.update).toHaveBeenCalledTimes(1);
    expect(territoryRepository.setVisitHistory).toHaveBeenCalledTimes(1);
    // invocationCallOrder is global across mocks: territory update must come first
    expect(territoryRepository.update.mock.invocationCallOrder[0]).toBeLessThan(
      territoryRepository.setVisitHistory.mock.invocationCallOrder[0],
    );
  });

  it('passes the territory id with each history entry to setVisitHistory', () => {
    const entry = historyEntry({ id: 'H1', visitOutcome: VisitOutcomeEnum.MOVED });

    bo.resolveTerritoryHistoryAlert(
      territory({ id: 'TERRITORY-A', recentHistory: [entry] }),
      [entry],
      VisitOutcomeEnum.MOVED,
    ).subscribe();

    expect(territoryRepository.setVisitHistory).toHaveBeenCalledWith(
      'TERRITORY-A',
      expect.objectContaining({ id: 'H1', isResolved: true }),
    );
  });

  it('keeps unrelated recentHistory entries on the territory document when resolving a subset', () => {
    const movedEntry = historyEntry({ id: 'H-MOVED', visitOutcome: VisitOutcomeEnum.MOVED });
    const revisitEntry = historyEntry({ id: 'H-REVISIT', isRevisit: true, date: new Date(2024, 1, 1) });
    const input = territory({ recentHistory: [movedEntry, revisitEntry] });

    bo.resolveTerritoryHistoryAlert(input, [revisitEntry], VisitOutcomeEnum.REVISIT).subscribe();

    const updatedTerritory = territoryRepository.update.mock.calls[0][0];
    // The `history` field is what the datasource uses to re-derive `recentHistory`:
    // resolving a revisit alert must not drop the MOVED entry from the territory document.
    expect(updatedTerritory.history?.map((h) => h.id)).toEqual(['H-MOVED', 'H-REVISIT']);
    expect(updatedTerritory.history?.find((h) => h.id === 'H-REVISIT')?.isRevisit).toBe(false);
    expect(updatedTerritory.history?.find((h) => h.id === 'H-MOVED')?.isRevisit).toBe(false);
  });

  it('does not mutate the input territory nor the input histories', () => {
    const movedEntry = historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED });
    const input = territory({ recentHistory: [movedEntry] });
    const territorySnapshot = structuredClone(input);
    const historySnapshot = structuredClone(movedEntry);

    bo.resolveTerritoryHistoryAlert(input, [movedEntry], VisitOutcomeEnum.MOVED).subscribe();

    expect(input).toEqual(territorySnapshot);
    expect(movedEntry).toEqual(historySnapshot);
  });
});
