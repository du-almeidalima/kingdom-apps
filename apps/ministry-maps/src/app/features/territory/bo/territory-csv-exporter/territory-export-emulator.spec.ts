/**
 * Parity check against the locally running Firebase emulator. Skipped unless
 * MM_EMULATOR_PARITY=1 so the ordinary unit suite never needs the emulator:
 *
 *   MM_EMULATOR_PARITY=1 npx nx test ministry-maps --testFile=territory-export-emulator.spec.ts --runInBand
 */
import * as admin from 'firebase-admin';
import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

// firebase-admin's gRPC transport expects Node's setImmediate, which jsdom omits.
if (typeof globalThis.setImmediate !== 'function') {
  (globalThis as unknown as { setImmediate: (fn: () => void) => void }).setImmediate = (fn) => setTimeout(fn, 0);
}

import type { FirebaseTerritoryModel } from '../../../../../models/firebase/firebase-territory-model';
import type { Territory } from '../../../../../models/territory';
import { convertTerritoryFirebaseTimestampsToDate } from '../../../../repositories/firebase/firebase-territory-datasource.service';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { TerritoryCsvExporterBO } from './territory-csv-exporter.bo';
import { parseXlsxWorksheetRows } from './xlsx-workbook';

const EMULATOR_HOST = '127.0.0.1:8080'; // keeps in sync with e2e/config/emulator.config.ts
const PROJECT_ID = 'du-ministry-maps';
const describeWithEmulator = process.env['MM_EMULATOR_PARITY'] === '1' ? describe : describe.skip;

/** Minimal RFC 4180 reader for the exporter's `;`-delimited, double-quoted output. */
function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ';') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

describeWithEmulator('Territory CSV/XLSX parity against the Firebase emulator', () => {
  let territories: Territory[];

  beforeAll(async () => {
    process.env['FIRESTORE_EMULATOR_HOST'] = EMULATOR_HOST;
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: PROJECT_ID });
    }

    const snapshot = await admin.firestore().collection('territories').get();
    territories = snapshot.docs.map((doc) => ({
      ...convertTerritoryFirebaseTimestampsToDate(doc.data() as FirebaseTerritoryModel),
      id: doc.id,
    }));
  }, 30_000);

  let exporter: TerritoryCsvExporterBO;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockProvider(UserStateService), MockProvider(TerritoryRepository), TerritoryCsvExporterBO],
    });
    exporter = TestBed.inject(TerritoryCsvExporterBO);
  });

  it('exports the same business rows in both formats for every emulator territory', () => {
    expect(territories.length).toBeGreaterThan(0);

    const expected = exporter.buildRows(territories);
    const csvRows = exporter.buildCsv(territories).split('\r\n').map(parseCsvRow);
    const xlsxRows = parseXlsxWorksheetRows(exporter.buildXlsx(territories));

    const headers = [...TerritoryCsvExporterBO.HEADERS];
    expect(csvRows[0]).toEqual(headers);
    expect(xlsxRows[0]).toEqual(headers);
    expect(csvRows).toHaveLength(expected.length + 1);
    expect(xlsxRows).toHaveLength(expected.length + 1);

    // Only the CSV prefixes formula-looking values with `'` (injection guard);
    // strip that serialization artifact before comparing cell by cell.
    for (let row = 0; row < expected.length; row++) {
      for (let col = 0; col < expected[row].length; col++) {
        const value = expected[row][col];
        expect(xlsxRows[row + 1][col]).toBe(value);
        expect(csvRows[row + 1][col]).toBe(/^[=+\-@]/.test(value) ? `'${value}` : value);
      }
    }
  });
});
