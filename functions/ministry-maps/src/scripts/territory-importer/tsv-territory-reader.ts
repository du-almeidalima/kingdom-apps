import * as fs from 'node:fs';

import {
  RawTerritoryImportRow,
  TERRITORY_TSV_HEADERS,
  TerritoryTsvHeader,
} from './territory-import.model';

export const parseTerritoryTsv = (content: string): RawTerritoryImportRow[] => {
  const normalized = content.replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/);

  const headerLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (headerLineIndex === -1) {
    throw new Error('TSV content is empty.');
  }

  const rawHeaders = lines[headerLineIndex].split('\t').map((header) => header.trim());
  const expectedSet = new Set<string>(TERRITORY_TSV_HEADERS);
  const actualSet = new Set<string>(rawHeaders);

  const missingHeaders = TERRITORY_TSV_HEADERS.filter((header) => !actualSet.has(header));
  const unknownHeaders = rawHeaders.filter((header) => !expectedSet.has(header));
  const hasDuplicates = actualSet.size !== rawHeaders.length;

  if (missingHeaders.length > 0 || unknownHeaders.length > 0 || hasDuplicates) {
    const details: string[] = [];
    if (missingHeaders.length > 0) details.push(`missing: [${missingHeaders.join(', ')}]`);
    if (unknownHeaders.length > 0) details.push(`unknown: [${unknownHeaders.join(', ')}]`);
    if (hasDuplicates) details.push('duplicate column names detected');
    throw new Error(`Invalid TSV header on line ${headerLineIndex + 1} (${details.join('; ')}).`);
  }

  const headers = rawHeaders as TerritoryTsvHeader[];
  const rows: RawTerritoryImportRow[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    const lineNumber = i + 1;
    const cells = line.split('\t');

    if (cells.length > headers.length) {
      throw new Error(
        `Line ${lineNumber} has ${cells.length} tab-separated columns, expected ${headers.length}. Check for stray tabs inside field values.`,
      );
    }

    const row = { lineNumber } as RawTerritoryImportRow;
    for (let col = 0; col < headers.length; col++) {
      row[headers[col]] = (cells[col] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
};

export const readTerritoryTsvFile = (filePath: string): RawTerritoryImportRow[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseTerritoryTsv(content);
};
