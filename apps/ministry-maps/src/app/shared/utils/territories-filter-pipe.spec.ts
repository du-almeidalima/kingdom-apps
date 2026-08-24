import { of } from 'rxjs';

import { Territory, TerritoryIcon } from '../../../models/territory';
import { TerritoryVisitHistory } from '../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../models/enums/visit-outcome';
import { territoryMockBuilder } from '../../../test/mocks';

import {
  ALL_OPTION,
  cityFilter,
  TerritoriesOrderBy,
  territoriesFilterPipe,
  TerritoryFilterSettings,
} from './territories-filter-pipe';

const historyEntry = (partial: Partial<TerritoryVisitHistory> = {}): TerritoryVisitHistory => ({
  id: 'HISTORY-1',
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: new Date(2024, 0, 1),
  notes: '',
  ...partial,
});

const territory = (partial: Partial<Territory>): Territory =>
  territoryMockBuilder({
    icon: TerritoryIcon.MAN,
    city: 'City 1',
    address: 'Alpha Street 1',
    note: 'regular note',
    positionIndex: 0,
    lastVisit: new Date(2024, 0, 1),
    history: [],
    recentHistory: [],
    ...partial,
  });

const runPipe = (territories: Territory[], settings: TerritoryFilterSettings): Territory[] => {
  const emissions: Territory[][] = [];
  territoriesFilterPipe(of(territories), settings).subscribe((result) => emissions.push(result));
  return emissions[0];
};

const ids = (territories: Territory[]) => territories.map((t) => t.id);

describe('cityFilter', () => {
  it('passes any territory when city is ALL_OPTION', () => {
    expect(cityFilter(territory({ city: 'City 1' }), ALL_OPTION)).toBe(true);
  });

  it('matches the city case-insensitively', () => {
    expect(cityFilter(territory({ city: 'City 1' }), 'city 1')).toBe(true);
    expect(cityFilter(territory({ city: 'City 1' }), 'CITY 1')).toBe(true);
  });

  it('rejects a different city', () => {
    expect(cityFilter(territory({ city: 'City 1' }), 'City 2')).toBe(false);
  });
});

describe('territoriesFilterPipe', () => {
  const baseSettings: TerritoryFilterSettings = { city: ALL_OPTION };

  describe('city', () => {
    it('keeps only territories of the selected city', () => {
      const result = runPipe([territory({ id: 'T1', city: 'City 1' }), territory({ id: 'T2', city: 'City 2' })], {
        city: 'City 2',
      });

      expect(ids(result)).toEqual(['T2']);
    });
  });

  describe('bible students', () => {
    const territories = () => [territory({ id: 'T1' }), territory({ id: 'T2', isBibleStudent: true })];

    it('hides bible students by default', () => {
      expect(ids(runPipe(territories(), baseSettings))).toEqual(['T1']);
    });

    it('keeps bible students when includeBibleStudent is set', () => {
      expect(ids(runPipe(territories(), { ...baseSettings, filters: { includeBibleStudent: true } }))).toEqual([
        'T1',
        'T2',
      ]);
    });
  });

  describe('recently moved', () => {
    const territories = () => [
      territory({ id: 'T1' }),
      territory({
        id: 'T2',
        recentHistory: [historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED, isResolved: false })],
      }),
      territory({
        id: 'T3',
        recentHistory: [historyEntry({ visitOutcome: VisitOutcomeEnum.MOVED, isResolved: true })],
      }),
    ];

    it('hides unresolved moved territories by default', () => {
      expect(ids(runPipe(territories(), baseSettings))).toEqual(['T1', 'T3']);
    });

    it('keeps moved territories when includeMoved is set', () => {
      expect(ids(runPipe(territories(), { ...baseSettings, filters: { includeMoved: true } }))).toEqual([
        'T1',
        'T2',
        'T3',
      ]);
    });
  });

  describe('icon', () => {
    it('keeps only territories matching the selected icon', () => {
      const result = runPipe(
        [territory({ id: 'T1', icon: TerritoryIcon.MAN }), territory({ id: 'T2', icon: TerritoryIcon.WOMAN })],
        { ...baseSettings, filters: { icon: TerritoryIcon.WOMAN } },
      );

      expect(ids(result)).toEqual(['T2']);
    });

    it('keeps every icon when no icon filter is set', () => {
      const result = runPipe(
        [territory({ id: 'T1', icon: TerritoryIcon.MAN }), territory({ id: 'T2', icon: TerritoryIcon.WOMAN })],
        baseSettings,
      );

      expect(ids(result)).toEqual(['T1', 'T2']);
    });
  });

  describe('search', () => {
    const territories = () => [
      territory({ id: 'T1', address: 'Alpha Street', note: 'left gate' }),
      territory({ id: 'T2', address: 'Beta Avenue', note: 'Alpha keyword in note' }),
      territory({ id: 'T3', address: 'Gamma Road', note: 'plain note' }),
    ];

    it.each([
      ['single word matching an address', 'alpha', ['T1', 'T2']],
      ['single word matching a note', 'gate', ['T1']],
      ['case-insensitive match', 'ALPHA', ['T1', 'T2']],
      ['no match at all', 'zeta', []],
      ['empty search term passes everything', '', ['T1', 'T2', 'T3']],
      ['null search term passes everything', null, ['T1', 'T2', 'T3']],
      ['multiple words are AND-ed and can span address and note', 'alpha gate', ['T1']],
      ['multiple consecutive spaces do not break the search', 'alpha  gate', ['T1']],
    ])('%s', (_desc, searchTerm, expected) => {
      expect(ids(runPipe(territories(), { ...baseSettings, searchTerm }))).toEqual(expected);
    });
  });

  describe('sorting', () => {
    it('sorts by positionIndex ascending (SAVED_INDEX default)', () => {
      const result = runPipe(
        [
          territory({ id: 'T1', positionIndex: 5 }),
          territory({ id: 'T2', positionIndex: 1 }),
          territory({ id: 'T3', positionIndex: 3 }),
        ],
        { city: 'City 1' },
      );

      expect(ids(result)).toEqual(['T2', 'T3', 'T1']);
    });

    it('treats a missing positionIndex as 0', () => {
      const result = runPipe([territory({ id: 'T1', positionIndex: 1 }), territory({ id: 'T2' })], { city: 'City 1' });

      expect(ids(result)).toEqual(['T2', 'T1']);
    });

    it('sorts by lastVisit ascending when orderBy is LAST_VISIT', () => {
      const result = runPipe(
        [
          territory({ id: 'T1', lastVisit: new Date(2024, 2, 1), positionIndex: 0 }),
          territory({ id: 'T2', lastVisit: new Date(2024, 0, 1), positionIndex: 1 }),
        ],
        { city: 'City 1', orderBy: TerritoriesOrderBy.LAST_VISIT },
      );

      expect(ids(result)).toEqual(['T2', 'T1']);
    });

    it('sorts by city name regardless of orderBy when city is ALL', () => {
      const result = runPipe(
        [
          territory({ id: 'T1', city: 'City 2', positionIndex: 0, lastVisit: new Date(2024, 2, 1) }),
          territory({ id: 'T2', city: 'City 1', positionIndex: 1, lastVisit: new Date(2024, 0, 1) }),
        ],
        { city: ALL_OPTION, orderBy: TerritoriesOrderBy.LAST_VISIT },
      );

      expect(ids(result)).toEqual(['T2', 'T1']);
    });
  });

  it('returns an empty array for an empty input', () => {
    expect(runPipe([], baseSettings)).toEqual([]);
  });

  it('does not mutate the source array order', () => {
    const source = [territory({ id: 'T1', positionIndex: 2 }), territory({ id: 'T2', positionIndex: 1 })];

    runPipe(source, baseSettings);

    expect(ids(source)).toEqual(['T1', 'T2']);
  });
});
