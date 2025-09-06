import { inject, Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserStateService } from '../../../../state/user.state.service';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import type { Territory } from '../../../../../models/territory';
import { TerritoryIconTranslatorPipe } from '../../../../shared/pipes/territory-icon-translator/territory-icon-translator.pipe';

/**
 * Service for exporting Territories into CSV.
 */
@Injectable()
export class TerritoryCsvExporterBO {
  private readonly userState = inject(UserStateService);
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly datePipe = new DatePipe('en-US');
  private readonly territoryIconTranslatorPipe = new TerritoryIconTranslatorPipe();

  /**
   * Exports all Territories into a downloadable blob of CSV.
   */
  export() {
    const congregationId = this.userState.currentUser?.congregation?.id;

    if (!congregationId) {
      throw new Error('No congregation id found');
    }

    this.territoryRepository.getAllByCongregation(congregationId).subscribe((territories) => {
      territories.sort((a, b) => {
        return a.city.localeCompare(b.city);
      });

      // Keep method for backward-compatibility; delegates to new CSV export.
      this.exportCsv(territories);
    });
  }

  /**
   * New method: Generates and triggers a CSV download for provided Territories.
   * Columns: city, address, note, mapsLink, icon, isBibleStudent, bibleInstructor, lastVisit
   */
  exportCsv(territories: Territory[]) {
    const headers = [
      'Cidade',
      'Endereço',
      'Observação',
      'Link do Mapa',
      'Ícone',
      'Estudante da Bíblia',
      'Instrutor da Bíblia',
      'Última Visita',
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);

      // Replace problematic characters for Excel compatibility
      return str
        .replace(/;/g, ',') // Replace semicolons with commas (safe since we use ; as delimiter)
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\r/g, ' ') // Replace carriage returns with spaces
        .replace(/\t/g, ' '); // Replace tabs with spaces
    };

    const rows =
      territories?.map((t) => {
        const values = [
          (t.city ?? '').trim(),
          (t.address ?? '').trim(),
          (t.note ?? '').trim(),
          (t.mapsLink ?? '').trim(),
          t.icon ? this.territoryIconTranslatorPipe.transform(t.icon) : '',
          t.isBibleStudent ? 'Sim' : '',
          (t.bibleInstructor ?? '').trim(),
          t.lastVisit ? this.datePipe.transform(t.lastVisit, 'dd/MM/yyyy') : '',
        ];
        return values.map(escapeCsv).join(';');
      }) ?? [];

    const csvContent = [headers.join(';'), ...rows].join('\r\n');

    // Prepend BOM for proper Excel opening in Portuguese locales
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

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
}
