import { DatePipe } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { map, take } from 'rxjs';
import type { Territory } from '../../../../../models/territory';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { TerritoryIconTranslatorPipe } from '../../../../shared/pipes/territory-icon-translator/territory-icon-translator.pipe';
import { UserStateService } from '../../../../state/user.state.service';

/**
 * Service for exporting Territories into CSV.
 *
 * The file is meant to be opened in Excel (pt-BR): UTF-8 with BOM, `;` as delimiter and CRLF line breaks.
 */
@Injectable()
export class TerritoryCsvExporterBO {
  private static readonly HEADERS = [
    'Cidade',
    'Endereço',
    'Observação',
    'Link do Mapa',
    'Ícone',
    'Estudante da Bíblia',
    'Instrutor da Bíblia',
    'Última Visita',
    'Resultado da Última Visita',
  ];
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
   * Exports all Territories into a downloadable blob of CSV.
   */
  export() {
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

        this.exportCsv(sorted);

        return true;
      }),
    );
  }

  /**
   * Generates and triggers the download of a CSV file for the provided Territories.
   */
  exportCsv(territories: Territory[]): void {
    const csv = this.buildCsv(territories);

    // The BOM makes Excel and most viewers detect UTF-8 instead of guessing a legacy code page.
    const blob = new Blob([TerritoryCsvExporterBO.UTF8_BOM, csv], { type: 'text/csv;charset=utf-8;' });

    const fileName = `mm-territorios-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;

    // Trigger download (browser environment)
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
   * Builds the CSV text (without BOM) for the provided Territories.
   * Columns: city, address, note, mapsLink, icon, isBibleStudent, bibleInstructor, lastVisit, lastVisitOutcome
   */
  buildCsv(territories: Territory[]): string {
    const escape = (value: unknown) => TerritoryCsvExporterBO.escapeCsv(value);

    const header = TerritoryCsvExporterBO.HEADERS.map(escape).join(';');

    const rows = (territories ?? []).map((t) =>
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
      ]
        .map(escape)
        .join(';'),
    );

    return [header, ...rows].join('\r\n');
  }

  /**
   * Outcome of the most recent visit in pt-BR, or '' when there is none.
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
    if (value === null || value === undefined) return '';

    let text = String(value)
      // Precomposed form ('a' + U+0303 -> 'ã'): decomposed accents render badly in some readers/fonts.
      .normalize('NFC')
      // One record per line: line breaks and tabs become a single space.
      .replace(/[\r\n\t]+/g, ' ')
      // Drop any other control characters.
      .replace(/\p{Cc}/gu, '')
      .trim();

    // Spreadsheet formula injection: a note such as "=HYPERLINK(...)" or "-- evitar" would be evaluated on open.
    if (/^[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    // RFC 4180: quote fields that contain the delimiter or a quote, doubling the quotes inside.
    return /[;"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
