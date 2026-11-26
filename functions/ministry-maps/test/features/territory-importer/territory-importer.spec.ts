import type { Firestore } from 'firebase-admin/firestore';

import {
  buildTerritoryImportPlan,
  formatImportedTerritoryNote,
} from '../../../src/scripts/territory-importer/territory-import-builder';
import { validateTerritoryImportRows } from '../../../src/scripts/territory-importer/territory-import-validator';
import { writeImportedTerritories } from '../../../src/scripts/territory-importer/territory-firestore-writer';
import { TERRITORY_TSV_HEADERS } from '../../../src/scripts/territory-importer/territory-import.model';
import { parseTerritoryTsv } from '../../../src/scripts/territory-importer/tsv-territory-reader';
import { VisitOutcomeEnum } from '../../../src/models/designations-progress';

const HEADER_LINE = TERRITORY_TSV_HEADERS.join('\t');

const makeTsvRow = (overrides: Partial<Record<(typeof TERRITORY_TSV_HEADERS)[number], string>> = {}): string => {
  const defaults: Record<(typeof TERRITORY_TSV_HEADERS)[number], string> = {
    city: 'Campinas',
    address: 'Rua Barão de Jaguara, 500',
    note: '',
    mapGroup: '',
    mapsLink: '',
    icon: '',
    peopleQuantity: '',
    positionIndex: '',
    isBibleStudent: '',
    bibleInstructor: '',
    lastVisit: '',
    visitOutcome: '',
    isRevisit: '',
    visitPublisher: '',
    ...overrides,
  };
  return TERRITORY_TSV_HEADERS.map((key) => defaults[key]).join('\t');
};

describe('territory-importer', () => {
  describe('parseTerritoryTsv', () => {
    it('parses UTF-8 BOM, ignores blank lines, and preserves 1-based file line numbers', () => {
      const tsv = `\uFEFF\n${HEADER_LINE}\n\n${makeTsvRow({ address: 'Rua A, 1' })}\r\n${makeTsvRow({ address: 'Rua B, 2' })}\n`;
      const rows = parseTerritoryTsv(tsv);

      expect(rows).toHaveLength(2);
      expect(rows[0].lineNumber).toBe(4);
      expect(rows[0].address).toBe('Rua A, 1');
      expect(rows[1].lineNumber).toBe(5);
      expect(rows[1].address).toBe('Rua B, 2');
    });

    it('throws when headers are missing or unknown', () => {
      expect(() => parseTerritoryTsv('city\taddress\tunknownCol\nCampinas\tRua 1\tx')).toThrow(
        /Invalid TSV header on line 1 \(missing: \[note, mapGroup.*unknown: \[unknownCol\]\)/,
      );
    });

    it('throws when a data row contains extra tab columns', () => {
      const badRow = `${makeTsvRow()}\textraCell`;
      expect(() => parseTerritoryTsv(`${HEADER_LINE}\n${badRow}`)).toThrow(
        /Line 2 has 15 tab-separated columns, expected 14/,
      );
    });
  });

  describe('validateTerritoryImportRows', () => {
    const allowedCities = ['Campinas', 'Valinhos'];

    it('validates a complete set of rows and applies defaults for optional fields', () => {
      const tsv = [
        HEADER_LINE,
        makeTsvRow({
          city: 'Campinas',
          address: 'Rua 1',
          note: 'Maria',
          mapGroup: 'Mapa 01',
          mapsLink: 'https://maps.app.goo.gl/111',
          icon: 'w',
          peopleQuantity: '2',
          isBibleStudent: 'true',
          bibleInstructor: 'Ana',
          lastVisit: '2026-03-10',
          visitOutcome: 'SPOKE',
          isRevisit: 'false',
          visitPublisher: 'Ana',
        }),
        makeTsvRow({
          city: 'Valinhos',
          address: 'Rua 2',
          lastVisit: '2026-02-15',
          isRevisit: 'true',
        }),
      ].join('\n');

      const rawRows = parseTerritoryTsv(tsv);
      const { validRows, errors } = validateTerritoryImportRows(rawRows, allowedCities);

      expect(errors).toEqual([]);
      expect(validRows).toHaveLength(2);
      expect(validRows[0]).toMatchObject({
        city: 'Campinas',
        address: 'Rua 1',
        note: 'Maria',
        mapGroup: 'Mapa 01',
        mapsLink: 'https://maps.app.goo.gl/111',
        icon: 'w',
        peopleQuantity: 2,
        isBibleStudent: true,
        bibleInstructor: 'Ana',
        visitOutcome: VisitOutcomeEnum.SPOKE,
        isRevisit: false,
        visitPublisher: 'Ana',
      });
      expect(validRows[1]).toMatchObject({
        city: 'Valinhos',
        icon: 'o',
        peopleQuantity: 1,
        isBibleStudent: false,
        visitOutcome: VisitOutcomeEnum.REVISIT,
        isRevisit: true,
      });
    });

    it('defaults lastVisit to today when visitOutcome, isRevisit, or visitPublisher is set without a date', () => {
      const fixedNow = new Date('2026-11-25T18:45:00Z');
      const tsv = [
        HEADER_LINE,
        makeTsvRow({
          city: 'Campinas',
          address: 'Rua Sem Data, 10',
          visitOutcome: 'MOVED',
        }),
        makeTsvRow({
          city: 'Valinhos',
          address: 'Rua Revisita Sem Data, 20',
          isRevisit: 'true',
        }),
      ].join('\n');

      const { validRows, errors } = validateTerritoryImportRows(
        parseTerritoryTsv(tsv),
        allowedCities,
        fixedNow,
      );

      expect(errors).toEqual([]);
      expect(validRows).toHaveLength(2);
      expect(validRows[0].lastVisit).toEqual(new Date('2026-11-25T12:00:00.000Z'));
      expect(validRows[0].visitOutcome).toBe(VisitOutcomeEnum.MOVED);
      expect(validRows[1].lastVisit).toEqual(new Date('2026-11-25T12:00:00.000Z'));
      expect(validRows[1].visitOutcome).toBe(VisitOutcomeEnum.REVISIT);
      expect(validRows[1].isRevisit).toBe(true);
    });

    it('allows the same mapsLink when addresses differ (e.g. different apartments in the same building)', () => {
      const tsv = [
        HEADER_LINE,
        makeTsvRow({
          city: 'Campinas',
          address: 'Rua Barão de Jaguara, 500 - Apto 101',
          mapsLink: 'https://maps.app.goo.gl/same-building',
        }),
        makeTsvRow({
          city: 'Campinas',
          address: 'Rua Barão de Jaguara, 500 - Apto 202',
          mapsLink: 'https://maps.app.goo.gl/same-building',
        }),
      ].join('\n');

      const { validRows, errors } = validateTerritoryImportRows(parseTerritoryTsv(tsv), allowedCities);

      expect(errors).toEqual([]);
      expect(validRows).toHaveLength(2);
    });

    it('rejects unknown cities, duplicate (address + mapsLink), duplicate positionIndex per city, and invalid dates', () => {
      const tsv = [
        HEADER_LINE,
        makeTsvRow({
          city: 'Campinas',
          address: 'Rua Duplicada, 100',
          mapsLink: 'https://maps.app.goo.gl/dup',
          positionIndex: '0',
        }),
        makeTsvRow({
          city: 'Sorocaba',
          address: '',
          mapsLink: 'not-a-url',
          icon: 'Homem',
          peopleQuantity: '0',
          positionIndex: '0',
          isBibleStudent: 'Sim',
          lastVisit: '2026-02-30',
          visitOutcome: 'INVALID_OUTCOME',
          isRevisit: 'Não',
        }),
        makeTsvRow({
          city: 'Campinas',
          address: '  rua   duplicada, 100  ',
          mapsLink: '  https://maps.app.goo.gl/dup  ',
          positionIndex: '0',
        }),
      ].join('\n');

      const rawRows = parseTerritoryTsv(tsv);
      const { validRows, errors } = validateTerritoryImportRows(rawRows, allowedCities);

      expect(validRows).toHaveLength(1);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lineNumber: 3, field: 'city' }),
          expect.objectContaining({ lineNumber: 3, field: 'address' }),
          expect.objectContaining({ lineNumber: 3, field: 'mapsLink' }),
          expect.objectContaining({ lineNumber: 3, field: 'icon' }),
          expect.objectContaining({ lineNumber: 3, field: 'peopleQuantity' }),
          expect.objectContaining({ lineNumber: 3, field: 'isBibleStudent' }),
          expect.objectContaining({ lineNumber: 3, field: 'lastVisit' }),
          expect.objectContaining({ lineNumber: 3, field: 'visitOutcome' }),
          expect.objectContaining({ lineNumber: 3, field: 'isRevisit' }),
          expect.objectContaining({ lineNumber: 4, field: 'mapsLink' }),
          expect.objectContaining({ lineNumber: 4, field: 'positionIndex' }),
        ]),
      );
    });
  });

  describe('buildTerritoryImportPlan', () => {
    it('formats mapGroup and note combinations accurately', () => {
      expect(formatImportedTerritoryNote('Portão verde', 'Mapa 01')).toBe('Mapa 01: Portão verde');
      expect(formatImportedTerritoryNote('', 'Mapa 01')).toBe('Mapa 01');
      expect(formatImportedTerritoryNote('Portão verde', undefined)).toBe('Portão verde');
      expect(formatImportedTerritoryNote('', undefined)).toBe('');
    });

    it('builds territory and history payloads with per-city positionIndex and isImported=true', () => {
      const tsv = [
        HEADER_LINE,
        makeTsvRow({
          city: 'Campinas',
          address: 'Rua 1',
          note: 'Maria',
          mapGroup: 'Mapa 01',
          lastVisit: '2026-03-10',
          visitOutcome: 'MOVED',
          visitPublisher: 'Carlos',
        }),
        makeTsvRow({
          city: 'Campinas',
          address: 'Rua 2',
          mapGroup: 'Mapa 02',
        }),
        makeTsvRow({
          city: 'Valinhos',
          address: 'Rua 3',
        }),
      ].join('\n');

      const { validRows, errors } = validateTerritoryImportRows(parseTerritoryTsv(tsv), [
        'Campinas',
        'Valinhos',
      ]);
      expect(errors).toEqual([]);

      let idCounter = 0;
      const plan = buildTerritoryImportPlan(validRows, 'CONG-1', () => `TERR-${++idCounter}`);

      expect(plan).toHaveLength(3);

      expect(plan[0].territory).toMatchObject({
        id: 'TERR-1',
        congregationId: 'CONG-1',
        city: 'Campinas',
        address: 'Rua 1',
        note: 'Mapa 01: Maria',
        positionIndex: 0,
        isImported: true,
      });
      expect(plan[0].history).toMatchObject({
        notes: '',
        isRevisit: false,
        visitOutcome: VisitOutcomeEnum.MOVED,
        congregationId: 'CONG-1',
        territoryId: 'TERR-1',
        name: 'Carlos',
      });
      expect(plan[0].territory.recentHistory).toEqual([plan[0].history]);

      expect(plan[1].territory).toMatchObject({
        id: 'TERR-2',
        city: 'Campinas',
        note: 'Mapa 02',
        positionIndex: 1,
        lastVisit: null,
        recentHistory: [],
        isImported: true,
      });
      expect(plan[1].history).toBeUndefined();

      expect(plan[2].territory).toMatchObject({
        id: 'TERR-3',
        city: 'Valinhos',
        note: '',
        positionIndex: 0,
        isImported: true,
      });
    });
  });

  describe('writeImportedTerritories', () => {
    const createMockDb = () => {
      const setCalls: Array<{ path: string; data: unknown }> = [];
      const commit = jest.fn().mockResolvedValue(undefined);

      const makeDocRef = (path: string) => ({
        path,
        collection: (subName: string) => ({
          doc: (subId: string) => makeDocRef(`${path}/${subName}/${subId}`),
        }),
      });

      const db = {
        collection: (name: string) => ({
          doc: (id: string) => makeDocRef(`${name}/${id}`),
        }),
        batch: () => ({
          set: (ref: { path: string }, data: unknown) => {
            setCalls.push({ path: ref.path, data });
          },
          commit,
        }),
      } as unknown as Firestore;

      return { db, setCalls, commit };
    };

    it('does not write or commit when dryRun is true', async () => {
      const { validRows } = validateTerritoryImportRows(
        parseTerritoryTsv(
          `${HEADER_LINE}\n${makeTsvRow({ lastVisit: '2026-03-10', visitOutcome: 'SPOKE' })}`,
        ),
        ['Campinas'],
      );
      const plan = buildTerritoryImportPlan(validRows, 'CONG-1', () => 'T1');
      const { db, setCalls, commit } = createMockDb();

      const stats = await writeImportedTerritories(db, plan, { dryRun: true });

      expect(stats).toEqual({
        territoriesWritten: 1,
        historyDocsWritten: 1,
        batchesCommitted: 0,
      });
      expect(setCalls).toHaveLength(0);
      expect(commit).not.toHaveBeenCalled();
    });

    it('writes territory and history documents and commits batches when dryRun is false', async () => {
      const { validRows } = validateTerritoryImportRows(
        parseTerritoryTsv(
          `${HEADER_LINE}\n${makeTsvRow({ lastVisit: '2026-03-10', visitOutcome: 'SPOKE' })}`,
        ),
        ['Campinas'],
      );
      const plan = buildTerritoryImportPlan(validRows, 'CONG-1', () => 'T1');
      const { db, setCalls, commit } = createMockDb();

      const stats = await writeImportedTerritories(db, plan, { dryRun: false });

      expect(stats).toEqual({
        territoriesWritten: 1,
        historyDocsWritten: 1,
        batchesCommitted: 1,
      });
      expect(commit).toHaveBeenCalledTimes(1);
      expect(setCalls.map((c) => c.path)).toEqual([
        'territories/T1',
        `territories/T1/history/${plan[0].history!.id}`,
      ]);
    });
  });
});
