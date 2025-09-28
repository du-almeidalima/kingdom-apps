import { TestBed } from '@angular/core/testing';
import { MockProvider, ngMocks } from 'ng-mocks';
import { of } from 'rxjs';

import { TerritoryCsvExporterBO } from './territory-csv-exporter.bo';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import type { Territory } from '../../../../../models/territory';
import {
  mockTerritory1,
  mockTerritory2,
  mockTerritory3,
  mockTerritory4,
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
          false
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
});
