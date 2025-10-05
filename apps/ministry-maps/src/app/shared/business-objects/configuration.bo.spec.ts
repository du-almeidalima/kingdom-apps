import { TestBed } from '@angular/core/testing';
import { ConfigurationBO, UpdateCongregationCityDTO } from './configuration.bo';
import { MockProvider, ngMocks } from 'ng-mocks';
import { CongregationRepository } from '../../repositories/congregation.repository';
import { TerritoryRepository } from '../../repositories/territories.repository';
import { UserStateService } from '../../state/user.state.service';
import { LoggerService } from '../services/logger/logger.service';
import { of } from 'rxjs';
import { elderUser, congregationMock } from '../../../test/mocks';
import { territoryMockBuilder } from '../../../test/mocks/models/territory.mock';
import { Territory } from '../../../models/territory';

describe('ConfigurationBO', () => {
  let service: ConfigurationBO;
  let congregationRepository: jest.Mocked<CongregationRepository>;
  let territoryRepository: jest.Mocked<TerritoryRepository>;
  let userState: UserStateService;

  const keysToCheck = (type: 'territory' | 'congregation'): string[] => {
    if (type === 'territory') {
      return [
        'id',
        'congregationId',
        'icon',
        'note',
        'lastVisit',
        'address',
        'mapsLink',
        'positionIndex',
        'history',
        'recentHistory',
      ];
    }

    return ['id', 'name', 'locatedOn', 'settings'];
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfigurationBO,
        MockProvider(UserStateService),
        MockProvider(LoggerService),
        MockProvider(CongregationRepository, {
          update: jest.fn(),
        }),
        MockProvider(TerritoryRepository, {
          getAllByCongregationAndCities: jest.fn(),
          batchUpdate: jest.fn(),
        }),
      ],
    });

    service = TestBed.inject(ConfigurationBO);
    congregationRepository = ngMocks.get(CongregationRepository) as jest.Mocked<CongregationRepository>;
    territoryRepository = ngMocks.get(TerritoryRepository) as jest.Mocked<TerritoryRepository>;
    userState = ngMocks.get(UserStateService);
    userState.setUser(elderUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add new cities without calling territory repo', (done) => {
    const updated: UpdateCongregationCityDTO[] = [{ newCityName: 'CityA' }, { newCityName: 'CityB' }];

    congregationRepository.update.mockReturnValue(of(undefined));

    service.updateCongregationCities(updated).subscribe({
      next: () => {
        expect(congregationRepository.update).toHaveBeenCalledWith(
          expect.objectContaining({ cities: ['CityA', 'CityB'] })
        );
        expect(territoryRepository.getAllByCongregationAndCities).not.toHaveBeenCalled();
        done();
      },
      error: (err) => done(err),
    });
  });

  it('should rename city and update territories', (done) => {
    const updated: UpdateCongregationCityDTO[] = [{ oldCityName: 'OldCity', newCityName: 'NewCity' }];

    congregationRepository.update.mockReturnValue(of(undefined));

    const territories: Territory[] = [
      territoryMockBuilder({ id: 't1', city: 'OldCity' }),
      territoryMockBuilder({ id: 't2', city: 'OtherCity' }),
    ];

    territoryRepository.getAllByCongregationAndCities.mockReturnValue(of(territories));
    territoryRepository.batchUpdate.mockReturnValue(of(undefined));

    service.updateCongregationCities(updated).subscribe({
      next: () => {
        expect(congregationRepository.update).toHaveBeenCalledWith(
          expect.objectContaining({ cities: ['NewCity'] })
        );

        expect(territoryRepository.getAllByCongregationAndCities).toHaveBeenCalledWith(
          congregationMock.id,
          ['OldCity']
        );

        // batchUpdate should receive only territories that had city changed
        expect(territoryRepository.batchUpdate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 't1', city: 'NewCity' }),
          ])
        );

        done();
      },
      error: (err) => done(err),
    });
  });

  it('should only change the city property for multiple updated territories (three territories)', (done) => {
    const updated: UpdateCongregationCityDTO[] = [{ oldCityName: 'OldCity', newCityName: 'NewCity' }];

    congregationRepository.update.mockReturnValue(of(undefined));

    const territories: Territory[] = [
      territoryMockBuilder({ id: 't1', city: 'OldCity' }),
      territoryMockBuilder({ id: 't2', city: 'OldCity' }),
      territoryMockBuilder({ id: 't3', city: 'OtherCity' }),
    ];

    // clone originals for later comparison
    const originalTerritories = territories.map((t) => ({ ...t }));

    territoryRepository.getAllByCongregationAndCities.mockReturnValue(of(territories));
    territoryRepository.batchUpdate.mockReturnValue(of(undefined));

    service.updateCongregationCities(updated).subscribe({
      next: () => {
        expect(territoryRepository.batchUpdate).toHaveBeenCalled();

        const updatedArgs = (territoryRepository.batchUpdate.mock.calls[0][0] as Territory[]);
        // only t1 and t2 should be updated
        expect(updatedArgs.length).toBe(2);

        const updatedIds = updatedArgs.map((t) => t.id).sort();
        expect(updatedIds).toEqual(['t1', 't2']);

        for (const origTerr of originalTerritories.filter((t) => t.city === 'OldCity')) {
          const updatedTerr = updatedArgs.find((t) => t.id === origTerr.id) as Territory;
          expect(updatedTerr).toBeDefined();
          // city updated
          expect(updatedTerr.city).toBe('NewCity');

          // check other props unchanged
          for (const key of keysToCheck('territory')) {
            const updatedRecord = updatedTerr as unknown as Record<string, unknown>;
            const origRecord = origTerr as unknown as Record<string, unknown>;
            expect(updatedRecord[key]).toEqual(origRecord[key]);
          }
        }

        // ensure territory that didn't match old city was not included in updates
        expect(updatedArgs.find((t) => t.id === 't3')).toBeUndefined();

        done();
      },
      error: (err) => done(err),
    });
  });

  it('should only change congregation.cities and no other congregation properties', (done) => {
    const updated: UpdateCongregationCityDTO[] = [
      { oldCityName: 'City 1', newCityName: 'City 1 Renamed' },
      { oldCityName: 'City 2', newCityName: 'City 2 Renamed' },
    ];

    // prepare congregation clone and spy return
    const originalCongregation = { ...congregationMock };
    const expectedCities = updated.map((u) => u.newCityName);

    congregationRepository.update.mockImplementation((c: unknown) => {
      // ensure the update is called with cities replaced
      const cRecord = c as unknown as Record<string, unknown>;
      expect(cRecord['cities']).toEqual(expectedCities);
      // ensure no other top-level properties changed except cities
      const origRecord = originalCongregation as unknown as Record<string, unknown>;
      for (const key of keysToCheck('congregation')) {
        expect(cRecord[key]).toEqual(origRecord[key]);
      }

      return of(undefined);
    });

    // no territories affected for this test
    territoryRepository.getAllByCongregationAndCities.mockReturnValue(of([]));
    territoryRepository.batchUpdate.mockReturnValue(of(undefined));

    service.updateCongregationCities(updated).subscribe({
      next: () => done(),
      error: (err) => done(err),
    });
  });

  it('should error when payload has duplicate new city names (case-insensitive)', (done) => {
    const updated: UpdateCongregationCityDTO[] = [{ newCityName: 'City' }, { newCityName: 'city' }];

    service.updateCongregationCities(updated).subscribe({
      next: () => done(new Error('Expected error')),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(String(err.message || err)).toMatch(/Duplicate new city name/i);
        expect(congregationRepository.update).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should error when adding a city that already exists in congregation', (done) => {
    // set congregation to have existing city
    const user = { ...elderUser, congregation: { ...congregationMock, cities: ['ExistingCity'] } };
    userState.setUser(user);

    const updated: UpdateCongregationCityDTO[] = [{ newCityName: 'existingcity' }];

    service.updateCongregationCities(updated).subscribe({
      next: () => done(new Error('Expected error')),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(String(err.message || err)).toMatch(/already exists in congregation/i);
        done();
      },
    });
  });

  it('should throw when there is no user or congregation', () => {
    userState.setUser(null);

    expect(() => service.updateCongregationCities([{ newCityName: 'X' }])).toThrow(
      'No User or Congregation found while updating congregation cities.'
    );
  });
});
