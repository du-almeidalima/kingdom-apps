import { TestBed } from '@angular/core/testing';
import { MockProvider, ngMocks } from 'ng-mocks';
import { of } from 'rxjs';

import { TerritoryCsvExporterBO } from './territory-csv-exporter.bo';
import { parseXlsxWorksheetRows, toColumnLetter, XLSX_MIME_TYPE } from './xlsx-workbook';
import { readStoredZipArchive } from './zip-archive';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import type { Territory } from '../../../../../models/territory';
import type { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import {
  mockTerritory1,
  mockTerritory2,
  mockTerritory3,
  mockTerritory4,
  territoryMockBuilder,
} from '../../../../../test/mocks';
import { adminUser, congregationMock } from '../../../../../test/mocks';

describe('TerritoryCsvExporterBO', () => {
  let territoryCsvExporterBO: TerritoryCsvExporterBO;
  let territoryRepository: TerritoryRepository;

  const daysAgo = (n: number) => {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return date;
  };

  const visit = (id: string, days: number, visitOutcome: VisitOutcomeEnum): TerritoryVisitHistory => ({
    id,
    notes: '',
    isRevisit: false,
    date: daysAgo(days),
    visitOutcome,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MockProvider(
          UserStateService,
          () => {
            const userStateServiceMock = new UserStateService();
            userStateServiceMock.setUser(adminUser);

            return userStateServiceMock;
          },
          'useFactory',
          false,
        ),
        MockProvider(TerritoryRepository, {
          getAllByCongregation: jest
            .fn()
            .mockImplementation(() => of([mockTerritory1, mockTerritory2, mockTerritory3, mockTerritory4])),
        }),
        TerritoryCsvExporterBO,
      ],
    });

    territoryCsvExporterBO = ngMocks.get(TerritoryCsvExporterBO);
    territoryRepository = ngMocks.get(TerritoryRepository);
  });

  it('throws when there is no congregation id', () => {
    const userStateService = ngMocks.get(UserStateService);
    userStateService.setUser(null);

    const svc = TestBed.inject(TerritoryCsvExporterBO);
    expect(() => svc.export()).toThrow('No congregation id found');
  });

  it('calls repository.getAllByCongregation and passes sorted territories to exportCsv by default', (done) => {
    const exportCsvSpy = jest.spyOn(territoryCsvExporterBO, 'exportCsv').mockImplementation(() => undefined);

    const obs = territoryCsvExporterBO.export();
    expect(typeof obs.subscribe).toBe('function');

    obs.subscribe({
      complete: () => {
        expect(territoryRepository.getAllByCongregation).toHaveBeenCalledWith(congregationMock.id);
        expect(exportCsvSpy).toHaveBeenCalled();
        const passed = exportCsvSpy.mock.calls[0][0] as Territory[];
        expect(passed[0].city).toBe(congregationMock.cities[0]);
        expect(passed[1].city).toBe(congregationMock.cities[0]);
        expect(passed[2].city).toBe(congregationMock.cities[1]);
        expect(passed[3].city).toBe(congregationMock.cities[2]);
        done();
      },
      error: (err) => done.fail(err),
    });
  });

  it('calls exportXlsx when format is "xlsx"', (done) => {
    const exportXlsxSpy = jest.spyOn(territoryCsvExporterBO, 'exportXlsx').mockImplementation(() => undefined);

    territoryCsvExporterBO.export('xlsx').subscribe({
      complete: () => {
        expect(exportXlsxSpy).toHaveBeenCalled();
        done();
      },
      error: (err) => done.fail(err),
    });
  });

  it('exportCsv and exportXlsx create the expected blobs and trigger downloads', () => {
    const anchor = document.createElement('a');
    jest.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement);
    const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);
    const removeSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);

    const createdBlobs: Blob[] = [];
    const urlLike = URL as unknown as {
      createObjectURL?: (obj: Blob | MediaSource) => string;
      revokeObjectURL?: (url: string) => void;
    };

    if (typeof urlLike.createObjectURL !== 'function') {
      urlLike.createObjectURL = (() => 'blob:url') as (obj: Blob | MediaSource) => string;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(urlLike as unknown as any, 'createObjectURL').mockImplementation((...args: unknown[]) => {
      const obj = args[0] as Blob | undefined;
      if (obj) {
        createdBlobs.push(obj);
      }
      return 'blob:url';
    });

    if (typeof urlLike.revokeObjectURL !== 'function') {
      urlLike.revokeObjectURL = (() => void 0) as (u: string) => void;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revokeSpy = jest.spyOn(urlLike as unknown as any, 'revokeObjectURL').mockImplementation(() => void 0);
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation(() => void 0);

    territoryCsvExporterBO.exportCsv([mockTerritory1]);
    expect(createdBlobs[0]?.type).toContain('text/csv');
    expect(anchor.download).toMatch(/^mm-territorios-.*\.csv$/);

    territoryCsvExporterBO.exportXlsx([mockTerritory1]);
    expect(createdBlobs[1]?.type).toBe(XLSX_MIME_TYPE);
    expect(anchor.download).toMatch(/^mm-territorios-.*\.xlsx$/);

    expect(appendSpy).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(removeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith('blob:url');
  });

  describe('buildCsv', () => {
    it('appends the most recent visit outcome label as the last column', () => {
      const lines = territoryCsvExporterBO.buildCsv([mockTerritory1]).split('\r\n');

      expect(lines[0]).toBe(
        'Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da Bíblia;Última Visita;Resultado da Última Visita',
      );
      // mockVisit1 (SPOKE) and mockVisit2 (NOT_ANSWERED) share a date; the last entry wins.
      expect(lines[1].endsWith('Ninguém atendeu')).toBe(true);
    });

    it('gates the outcome by date, not by array position', () => {
      // Stored descending (as the e2e seeder writes it) — the newest entry comes first.
      const territory = territoryMockBuilder({
        recentHistory: [visit('NEW', 0, VisitOutcomeEnum.MOVED), visit('OLD', 30, VisitOutcomeEnum.SPOKE)],
      });

      const lines = territoryCsvExporterBO.buildCsv([territory]).split('\r\n');

      expect(lines[1].endsWith('Morador mudou de endereço')).toBe(true);
    });

    it('leaves the outcome cell empty when the recent visit info is missing', () => {
      const territories = [
        territoryMockBuilder({ recentHistory: undefined }),
        territoryMockBuilder({ recentHistory: [] }),
        territoryMockBuilder({ recentHistory: [visit('DRIFT', 0, 999 as unknown as VisitOutcomeEnum)] }),
      ];

      const rows = territoryCsvExporterBO.buildCsv(territories).split('\r\n').slice(1);

      for (const row of rows) {
        expect(row.split(';')).toHaveLength(9);
        expect(row.endsWith(';')).toBe(true);
      }
    });
  });

  describe('buildXlsx', () => {
    it('packages a complete OOXML .xlsx archive with all required parts and headers', () => {
      const xlsxBytes = territoryCsvExporterBO.buildXlsx([mockTerritory1]);
      const archiveFiles = readStoredZipArchive(xlsxBytes);

      expect([...archiveFiles.keys()]).toEqual([
        '[Content_Types].xml',
        '_rels/.rels',
        'xl/workbook.xml',
        'xl/_rels/workbook.xml.rels',
        'xl/styles.xml',
        'xl/sharedStrings.xml',
        'xl/worksheets/sheet1.xml',
      ]);

      const rows = parseXlsxWorksheetRows(xlsxBytes);
      expect(rows[0]).toEqual([
        'Cidade',
        'Endereço',
        'Observação',
        'Link do Mapa',
        'Ícone',
        'Estudante da Bíblia',
        'Instrutor da Bíblia',
        'Última Visita',
        'Resultado da Última Visita',
      ]);
      expect(rows[1][8]).toBe('Ninguém atendeu');
    });

    it('preserves pt-BR accents, coordinates, and XML special characters cleanly', () => {
      const territory = territoryMockBuilder({
        city: 'São Paulo',
        address: '-22,4855180, -47,1152300 (1º R. Sebastião & "Filhos" <A>)',
        note: "Observação\ncom\tquebra\x00 e 'aspas'",
      });

      const rows = parseXlsxWorksheetRows(territoryCsvExporterBO.buildXlsx([territory]));

      expect(rows[1][0]).toBe('São Paulo');
      expect(rows[1][1]).toBe('-22,4855180, -47,1152300 (1º R. Sebastião & "Filhos" <A>)');
      expect(rows[1][2]).toBe("Observação com quebra e 'aspas'");
    });

    it('converts column indices to A1-style column letters', () => {
      expect(toColumnLetter(0)).toBe('A');
      expect(toColumnLetter(8)).toBe('I');
      expect(toColumnLetter(25)).toBe('Z');
      expect(toColumnLetter(26)).toBe('AA');
    });
  });
});
