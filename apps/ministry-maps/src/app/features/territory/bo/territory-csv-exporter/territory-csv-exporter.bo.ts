import { DatePipe } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { map, take } from 'rxjs';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import type { Territory } from '../../../../../models/territory';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { TerritoryIconTranslatorPipe } from '../../../../shared/pipes/territory-icon-translator/territory-icon-translator.pipe';
import { UserStateService } from '../../../../state/user.state.service';
import { buildXlsxWorkbook, sanitizeCellText, XLSX_MIME_TYPE } from './xlsx-workbook';

export type TerritoryExportFormat = 'csv' | 'xlsx';

/**
 * Service for exporting a congregation's Territories into either:
 * - `.xlsx` (Office Open XML workbook — works cleanly on desktop and mobile spreadsheet apps), or
 * - `.csv` (UTF-8 with BOM, `;`-delimited, CRLF line breaks).
 *
 * Both formats share the same column definitions and territory-to-row mapping (`buildRows`).
 */
@Injectable()
export class TerritoryCsvExporterBO {
  static readonly SHEET_NAME = 'Territórios';
  static readonly HEADERS = [
    'Cidade',
    'Endereço',
    'Observação',
    'Link do Mapa',
    'Ícone',
    'Estudante da Bíblia',
    'Instrutor da Bíblia',
    'Última Visita',
    'Resultado da Última Visita',
  ] as const;

  private static readonly UTF8_BOM = '\uFEFF';
  private static readonly collator = new Intl.Collator('pt-BR');

  /** Singular pt-BR labels, matching the visit dialog's outcome wording. */
  private static readonly VISIT_OUTCOME_LABELS: Partial<Record<VisitOutcomeEnum, string>> = {
    [VisitOutcomeEnum.SPOKE]: 'Morador contatado',
    [VisitOutcomeEnum.NOT_ANSWERED]: 'Ninguém atendeu',
    [VisitOutcomeEnum.MOVED]: 'Morador mudou de endereço',
    [VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN]: 'Morador pediu para não ser visitado',
    [VisitOutcomeEnum.REVISIT]: 'Revisita',
  };

  private readonly datePipe = new DatePipe('en-US');
  private readonly territoryIconTranslatorPipe = new TerritoryIconTranslatorPipe();
  private readonly userState = inject(UserStateService);
  private readonly territoryRepository = inject(TerritoryRepository);

  /**
   * Fetches all Territories for the current user's congregation, sorts them by city,
   * and triggers a file download in the requested format (`'csv'` or `'xlsx'`).
   */
  export(format: TerritoryExportFormat = 'csv') {
    const congregationId = this.userState.currentUser?.congregation?.id;

    if (!congregationId) {
      throw new Error('No congregation id found');
    }

    return this.territoryRepository.getAllByCongregation(congregationId).pipe(
      // One click = one file, even if the repository exposes a live (never-completing) stream.
      take(1),
      map((territories) => {
        // Sort a copy (the repository's array is left untouched) with a fixed locale,
        // so the order doesn't depend on the device's language.
        const sorted = [...(territories ?? [])].sort((a, b) =>
          TerritoryCsvExporterBO.collator.compare(a.city ?? '', b.city ?? ''),
        );

        if (format === 'xlsx') {
          this.exportXlsx(sorted);
        } else {
          this.exportCsv(sorted);
        }

        return true;
      }),
    );
  }

  /**
   * Generates and triggers the download of a CSV file for the provided Territories.
   */
  exportCsv(territories: Territory[]): void {
    const csv = this.buildCsv(territories);
    // The BOM makes desktop Excel and most viewers detect UTF-8 instead of guessing a legacy code page.
    const blob = new Blob([TerritoryCsvExporterBO.UTF8_BOM, csv], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, 'csv');
  }

  /**
   * Generates and triggers the download of an `.xlsx` workbook for the provided Territories.
   */
  exportXlsx(territories: Territory[]): void {
    const workbookBytes = this.buildXlsx(territories);
    const blob = new Blob([workbookBytes], { type: XLSX_MIME_TYPE });
    this.triggerDownload(blob, 'xlsx');
  }

  /**
   * Builds the CSV text (without BOM) for the provided Territories.
   */
  buildCsv(territories: Territory[]): string {
    const escape = (value: unknown) => TerritoryCsvExporterBO.escapeCsv(value);

    const header = TerritoryCsvExporterBO.HEADERS.map(escape).join(';');
    const rows = this.buildRows(territories).map((row) => row.map(escape).join(';'));

    return [header, ...rows].join('\r\n');
  }

  /**
   * Builds the binary `.xlsx` workbook (`Uint8Array`) for the provided Territories.
   */
  buildXlsx(territories: Territory[]): Uint8Array<ArrayBuffer> {
    return buildXlsxWorkbook({
      sheetName: TerritoryCsvExporterBO.SHEET_NAME,
      headers: TerritoryCsvExporterBO.HEADERS,
      rows: this.buildRows(territories),
    });
  }

  /**
   * Maps each Territory into its 9 human-readable worksheet cells.
   * Columns: city, address, note, mapsLink, icon, isBibleStudent, bibleInstructor, lastVisit, lastVisitOutcome
   */
  buildRows(territories: Territory[]): string[][] {
    return (territories ?? []).map((t) =>
      [
        t.city,
        t.address,
        t.note,
        t.mapsLink,
        t.icon ? this.territoryIconTranslatorPipe.transform(t.icon) : '',
        t.isBibleStudent ? 'Sim' : '',
        t.bibleInstructor,
        t.lastVisit ? this.datePipe.transform(t.lastVisit, 'dd/MM/yyyy') : '',
        TerritoryCsvExporterBO.lastVisitOutcome(t),
      ].map(sanitizeCellText),
    );
  }

  private triggerDownload(blob: Blob, extension: TerritoryExportFormat): void {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `mm-territorios-${timestamp}.${extension}`;

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Outcome of the most recent visit in pt-BR, or `''` when there is none.
   *
   * `recentHistory`'s ordering is a storage detail (ascending when written by the app,
   * descending when seeded by e2e), so the entry is gated by date, not by position.
   */
  private static lastVisitOutcome(territory: Territory): string {
    const entries = territory.recentHistory ?? [];
    if (!entries.length) {
      return '';
    }

    // On a date tie the last array entry wins.
    const last = entries.reduce((a, b) => (b.date >= a.date ? b : a));

    return TerritoryCsvExporterBO.VISIT_OUTCOME_LABELS[last.visitOutcome] ?? '';
  }

  /**
   * Makes a single value safe for a `;`-delimited CSV that will be opened in a spreadsheet.
   */
  private static escapeCsv(value: unknown): string {
    let text = sanitizeCellText(value);
    if (!text) {
      return '';
    }

    // Spreadsheet formula injection: a note such as "=HYPERLINK(...)" or "-- evitar" would be evaluated on open.
    if (/^[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    // RFC 4180: quote fields that contain the delimiter or a quote, doubling the quotes inside.
    return /[;"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
