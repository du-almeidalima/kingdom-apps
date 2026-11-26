import { createZipArchive, readStoredZipArchive } from './zip-archive';

/**
 * Zero-dependency Office Open XML (`.xlsx`) single-sheet workbook builder.
 *
 * Emits the canonical 6-part OOXML package (`[Content_Types].xml`, `_rels/.rels`,
 * `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml`, `xl/sharedStrings.xml`,
 * and `xl/worksheets/sheet1.xml`) with explicit UTF-8 XML headers and a Shared String Table (`t="s"`).
 *
 * Because encoding and cell types are declared inside the XML package rather than guessed by the viewer,
 * the resulting `.xlsx` opens with intact pt-BR accents and date strings across Desktop (OnlyOffice,
 * Excel, LibreOffice, macOS Numbers) and Mobile (Google Sheets on Android/iOS).
 */

export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface XlsxWorksheetInput {
  /** Tab title shown in the spreadsheet viewer (capped at 31 chars per Excel's limit). */
  sheetName: string;
  /** Column titles rendered in row 1 with bold formatting (`s="1"`). */
  headers: readonly string[];
  /** Data rows rendered from row 2 onwards (`s="0"`). */
  rows: readonly (readonly unknown[])[];
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

/**
 * Minimal schema-valid stylesheet:
 * - style index `0` (`s="0"`): normal 11pt Calibri cell
 * - style index `1` (`s="1"`): bold 11pt Calibri cell (used for the header row)
 */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

/**
 * Builds a complete `.xlsx` binary workbook (`Uint8Array`) from headers and data rows.
 */
export function buildXlsxWorkbook(input: XlsxWorksheetInput): Uint8Array<ArrayBuffer> {
  const allRows: readonly (readonly unknown[])[] = [input.headers, ...input.rows];
  const columnCount = Math.max(1, input.headers.length);

  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  let totalStringReferences = 0;

  const getSharedStringId = (text: string): number => {
    totalStringReferences++;
    const existing = sharedStringIndex.get(text);
    if (existing !== undefined) {
      return existing;
    }

    const index = sharedStrings.length;
    sharedStrings.push(text);
    sharedStringIndex.set(text, index);
    return index;
  };

  const xmlRows = allRows.map((row, rowIdx) => {
    const rowNumber = rowIdx + 1;
    const styleIndex = rowIdx === 0 ? 1 : 0;
    const cells: string[] = [];

    for (let colIdx = 0; colIdx < columnCount; colIdx++) {
      const text = sanitizeCellText(row[colIdx]);
      if (!text) {
        continue;
      }

      const cellRef = `${toColumnLetter(colIdx)}${rowNumber}`;
      const stringId = getSharedStringId(text);
      cells.push(`<c r="${cellRef}" s="${styleIndex}" t="s"><v>${stringId}</v></c>`);
    }

    return `<row r="${rowNumber}">${cells.join('')}</row>`;
  });

  const lastCellRef = `${toColumnLetter(columnCount - 1)}${Math.max(1, allRows.length)}`;
  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCellRef}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${xmlRows.join('')}</sheetData>
</worksheet>`;

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${totalStringReferences}" uniqueCount="${sharedStrings.length}">${sharedStrings
    .map((s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`)
    .join('')}</sst>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sanitizeSheetName(input.sheetName))}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  return createZipArchive([
    { path: '[Content_Types].xml', data: textEncoder.encode(CONTENT_TYPES_XML) },
    { path: '_rels/.rels', data: textEncoder.encode(ROOT_RELS_XML) },
    { path: 'xl/workbook.xml', data: textEncoder.encode(workbookXml) },
    { path: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(WORKBOOK_RELS_XML) },
    { path: 'xl/styles.xml', data: textEncoder.encode(STYLES_XML) },
    { path: 'xl/sharedStrings.xml', data: textEncoder.encode(sharedStringsXml) },
    { path: 'xl/worksheets/sheet1.xml', data: textEncoder.encode(worksheetXml) },
  ]);
}

/**
 * Normalizes a cell value into clean, single-line NFC text free of XML-illegal control characters.
 */
export function sanitizeCellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return (
    String(value)
      // Precomposed form ('a' + U+0303 -> 'ã') so decomposed accents never render separated.
      .normalize('NFC')
      // Collapse line breaks and tabs into a single space.
      .replace(/[\r\n\t]+/g, ' ')
      // Strip remaining C0/C1 control characters (illegal in XML 1.0).
      .replace(/\p{Cc}/gu, '')
      .trim()
  );
}

/** Converts a 0-based column index to an Excel column name (`0 -> 'A'`, `25 -> 'Z'`, `26 -> 'AA'`). */
export function toColumnLetter(columnIndex: number): string {
  let index = columnIndex;
  let letters = '';

  while (index >= 0) {
    letters = String.fromCharCode((index % 26) + 65) + letters;
    index = Math.floor(index / 26) - 1;
  }

  return letters;
}

/** Converts an Excel column name (`'A' -> 0`, `'Z' -> 25`, `'AA' -> 26`) back to a 0-based index. */
function fromColumnLetter(letters: string): number {
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
}

/** Escapes the 5 predefined XML entities. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/** Enforces Excel's worksheet tab rules (non-empty, max 31 chars, no `: \ / ? * [ ]`). */
function sanitizeSheetName(name: string): string {
  const cleaned = sanitizeCellText(name).replace(/[:\\/?*[\]]/g, ' ').trim();
  return (cleaned || 'Sheet1').slice(0, 31);
}

/**
 * Parses the first worksheet of a stored `.xlsx` buffer back into a 2D array of strings
 * (`[headerRow, ...dataRows]`), filling any omitted empty cells with `''`.
 */
export function parseXlsxWorksheetRows(xlsxBytes: Uint8Array): string[][] {
  const files = readStoredZipArchive(xlsxBytes);
  const sstBytes = files.get('xl/sharedStrings.xml');
  const sheetBytes = files.get('xl/worksheets/sheet1.xml');

  if (!sstBytes || !sheetBytes) {
    throw new Error('Invalid .xlsx archive: missing xl/sharedStrings.xml or xl/worksheets/sheet1.xml');
  }

  const sstXml = textDecoder.decode(sstBytes);
  const sheetXml = textDecoder.decode(sheetBytes);

  const sharedStrings: string[] = [];
  for (const match of sstXml.matchAll(/<si><t[^>]*>([\s\S]*?)<\/t><\/si>/g)) {
    sharedStrings.push(unescapeXml(match[1]));
  }

  const dimensionMatch = sheetXml.match(/<dimension ref="A1:([A-Z]+)\d+"\/>/);
  const columnCount = dimensionMatch ? fromColumnLetter(dimensionMatch[1]) + 1 : 0;

  const rows: string[][] = [];
  for (const rowMatch of sheetXml.matchAll(/<row r="\d+">([\s\S]*?)<\/row>/g)) {
    const rowCells = Array.from({ length: columnCount }, () => '');

    for (const cellMatch of rowMatch[1].matchAll(/<c r="([A-Z]+)\d+"[^>]*><v>(\d+)<\/v><\/c>/g)) {
      const colIndex = fromColumnLetter(cellMatch[1]);
      const stringIndex = Number(cellMatch[2]);
      rowCells[colIndex] = sharedStrings[stringIndex] ?? '';
    }

    rows.push(rowCells);
  }

  return rows;
}
