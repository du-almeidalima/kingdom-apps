import { TestBed } from '@angular/core/testing';
import { MockProvider, ngMocks } from 'ng-mocks';
import { of } from 'rxjs';

import { TerritoryCsvExporterBO } from './territory-csv-exporter.bo';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import type { Territory } from '../../../../../models/territory';
import type { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import {
  mockTerritory1,
  mockTerritory2,
  mockTerritory3,
  mockTerritory4,
  territoryMockBuilder,
} from '../../../../../test/mocks/models/territory.mock';
import { adminUser, congregationMock } from '../../../../../test/mocks';

describe('TerritoryCsvExporterBO', () => {
  let territoryCsvExporterBO: TerritoryCsvExporterBO;
  let territoryRepository: TerritoryRepository;

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

  it('calls repository.getAllByCongregation and passes sorted territories to exportCsv', (done) => {
    const exportCsvSpy = jest
      .spyOn(territoryCsvExporterBO as unknown as { exportCsv: (t: Territory[]) => void }, 'exportCsv')
      .mockImplementation(() => undefined);

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

  it('exportCsv creates a CSV blob and triggers a download', () => {
    // Prepare spies for DOM and URL operations
    const anchor = document.createElement('a');
    jest.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement);
    const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);
    const removeSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);

    let createdBlob: Blob | undefined;
    // JSDOM / test env may not provide URL.createObjectURL / revokeObjectURL.
    // Use a typed proxy for URL to avoid `any` and satisfy linting rules.
    const urlLike = URL as unknown as {
      createObjectURL?: (obj: Blob | MediaSource) => string;
      revokeObjectURL?: (url: string) => void;
    };

    if (typeof urlLike.createObjectURL !== 'function') {
      urlLike.createObjectURL = (() => 'blob:url') as (obj: Blob | MediaSource) => string;
    }

    // Use `any` for the spy target to satisfy jest.spyOn overloads. Disable the lint rule locally.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(urlLike as unknown as any, 'createObjectURL').mockImplementation((...args: unknown[]) => {
      const obj = args[0] as Blob | undefined;
      createdBlob = obj as Blob | undefined;
      return 'blob:url';
    });

    if (typeof urlLike.revokeObjectURL !== 'function') {
      urlLike.revokeObjectURL = (() => void 0) as (u: string) => void;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revokeSpy = jest.spyOn(urlLike as unknown as any, 'revokeObjectURL').mockImplementation(() => void 0);
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation(() => void 0);

    // Call exportCsv
    territoryCsvExporterBO.exportCsv([mockTerritory1, mockTerritory2, mockTerritory3, mockTerritory4]);

    expect(createdBlob).toBeDefined();
    expect(createdBlob?.type).toContain('text/csv');
    expect(appendSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:url');
    expect(anchor.download).toMatch(/^mm-territorios-/);
  });

  describe('buildCsv', () => {
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
});
