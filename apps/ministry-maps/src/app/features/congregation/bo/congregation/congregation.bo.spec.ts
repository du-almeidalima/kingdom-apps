import { TestBed } from '@angular/core/testing';
import { MockProvider, ngMocks } from 'ng-mocks';
import { lastValueFrom, of, throwError } from 'rxjs';

import { CongregationBO } from './congregation.bo';
import { CongregationRepository } from '../../../../repositories/congregation.repository';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { ProfileBO } from '../../../profile/bo/profile.bo';
import { congregationMock, elderUser, userMockBuilder } from '../../../../../test/mocks';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { RoleEnum } from '../../../../../models/enums/role';
import { Congregation } from '../../../../../models/congregation';

describe('CongregationBO', () => {
  let service: CongregationBO;
  let congregationRepository: jest.Mocked<CongregationRepository>;
  let territoryRepository: jest.Mocked<TerritoryRepository>;
  let profileBO: jest.Mocked<ProfileBO>;
  let userState: UserStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CongregationBO,
        UserStateService,
        MockProvider(LoggerService),
        MockProvider(ProfileBO, {
          changeUserCongregation: jest.fn(),
        }),
        MockProvider(CongregationRepository, {
          add: jest.fn(),
          update: jest.fn(),
        }),
        MockProvider(TerritoryRepository, {
          getAllByCongregation: jest.fn(),
          getAllByCongregationAndCities: jest.fn(),
          getNextPositionIndexForCity: jest.fn(),
          batchUpdate: jest.fn(),
          batchDelete: jest.fn(),
        }),
      ],
    });

    service = TestBed.inject(CongregationBO);
    congregationRepository = ngMocks.get(CongregationRepository) as jest.Mocked<CongregationRepository>;
    territoryRepository = ngMocks.get(TerritoryRepository) as jest.Mocked<TerritoryRepository>;
    profileBO = ngMocks.get(ProfileBO) as jest.Mocked<ProfileBO>;
    userState = TestBed.inject(UserStateService);
    userState.setUser({
      ...elderUser,
      congregation: { ...congregationMock, cities: ['City 1', 'City 2', 'City 3'] },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateCongregationName', () => {
    it('updates the congregation name and refreshes UserStateService', async () => {
      congregationRepository.update.mockReturnValue(of(undefined));

      await lastValueFrom(service.updateCongregationName('  Congregação Renomeada  '));

      expect(congregationRepository.update).toHaveBeenCalledWith({
        ...congregationMock,
        name: 'Congregação Renomeada',
      });
      expect(userState.currentUser?.congregation?.name).toBe('Congregação Renomeada');
    });

    it('errors when the new congregation name is empty or whitespace-only', async () => {
      await expect(lastValueFrom(service.updateCongregationName('   '))).rejects.toThrow(
        /congregation name cannot be empty/i,
      );
      expect(congregationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getTerritoryCountsByCity', () => {
    it('returns territory counts grouped by city for the current congregation', async () => {
      territoryRepository.getAllByCongregation.mockReturnValue(
        of([
          territoryMockBuilder({ id: 't1', city: 'City 1' }),
          territoryMockBuilder({ id: 't2', city: 'City 1' }),
          territoryMockBuilder({ id: 't3', city: 'City 2' }),
        ]),
      );

      await expect(lastValueFrom(service.getTerritoryCountsByCity())).resolves.toEqual({
        'City 1': 2,
        'City 2': 1,
      });
      expect(territoryRepository.getAllByCongregation).toHaveBeenCalledWith(congregationMock.id);
    });

    it('logs repository errors and returns no counts', async () => {
      territoryRepository.getAllByCongregation.mockReturnValue(throwError(() => new Error('query failed')));

      await expect(lastValueFrom(service.getTerritoryCountsByCity())).resolves.toEqual({});
      expect(ngMocks.get(LoggerService).error).toHaveBeenCalledWith(
        expect.stringContaining('Error loading territory counts by city'),
      );
    });
  });

  describe('addCity', () => {
    it('appends a trimmed city, persists the congregation, and refreshes UserStateService', async () => {
      congregationRepository.update.mockReturnValue(of(undefined));

      await lastValueFrom(service.addCity('  City 4  '));

      expect(congregationRepository.update).toHaveBeenCalledWith({
        ...congregationMock,
        cities: ['City 1', 'City 2', 'City 3', 'City 4'],
      });
      expect(userState.currentUser?.congregation?.cities).toEqual(['City 1', 'City 2', 'City 3', 'City 4']);
    });

    it('rejects empty city names', async () => {
      await expect(lastValueFrom(service.addCity('   '))).rejects.toThrow(/city name cannot be empty/i);
      expect(congregationRepository.update).not.toHaveBeenCalled();
    });

    it('rejects case-insensitively duplicate city names', async () => {
      await expect(lastValueFrom(service.addCity('city 1'))).rejects.toThrow(/already exists/i);
      expect(congregationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('renameCity', () => {
    it('updates the city in place, cascades the new name to matching territories, and refreshes UserStateService', async () => {
      congregationRepository.update.mockReturnValue(of(undefined));
      const t1 = territoryMockBuilder({ id: 't1', city: 'City 1' });
      const t2 = territoryMockBuilder({ id: 't2', city: 'City 1' });
      const t3 = territoryMockBuilder({ id: 't3', city: 'City 2' });
      territoryRepository.getAllByCongregationAndCities.mockReturnValue(of([t1, t2, t3]));
      territoryRepository.batchUpdate.mockReturnValue(of(undefined));

      await lastValueFrom(service.renameCity('City 1', 'City 1 Centro'));

      expect(congregationRepository.update).toHaveBeenCalledWith({
        ...congregationMock,
        cities: ['City 1 Centro', 'City 2', 'City 3'],
      });
      expect(territoryRepository.getAllByCongregationAndCities).toHaveBeenCalledWith(congregationMock.id, ['City 1']);
      expect(territoryRepository.batchUpdate).toHaveBeenCalledWith([
        { ...t1, city: 'City 1 Centro' },
        { ...t2, city: 'City 1 Centro' },
      ]);
      expect(userState.currentUser?.congregation?.cities).toEqual(['City 1 Centro', 'City 2', 'City 3']);
    });

    it('allows a case-only rename of the same city', async () => {
      congregationRepository.update.mockReturnValue(of(undefined));
      const t1 = territoryMockBuilder({ id: 't1', city: 'City 1' });
      territoryRepository.getAllByCongregationAndCities.mockReturnValue(of([t1]));
      territoryRepository.batchUpdate.mockReturnValue(of(undefined));

      await lastValueFrom(service.renameCity('City 1', 'CITY 1'));

      expect(congregationRepository.update).toHaveBeenCalledWith({
        ...congregationMock,
        cities: ['CITY 1', 'City 2', 'City 3'],
      });
      expect(territoryRepository.batchUpdate).toHaveBeenCalledWith([{ ...t1, city: 'CITY 1' }]);
    });

    it('rejects renaming a city to collide case-insensitively with another existing city', async () => {
      await expect(lastValueFrom(service.renameCity('City 1', 'city 2'))).rejects.toThrow(/already exists/i);
      expect(congregationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('reorderCities', () => {
    it('persists the new city array order and refreshes UserStateService', async () => {
      congregationRepository.update.mockReturnValue(of(undefined));
      const reordered = ['City 3', 'City 1', 'City 2'];

      await lastValueFrom(service.reorderCities(reordered));

      expect(congregationRepository.update).toHaveBeenCalledWith({
        ...congregationMock,
        cities: reordered,
      });
      expect(userState.currentUser?.congregation?.cities).toEqual(reordered);
    });
  });

  describe('removeCity', () => {
    it('transfers territories to targetCity with sequential positionIndex values and removes the city', async () => {
      congregationRepository.update.mockReturnValue(of(undefined));
      const t1 = territoryMockBuilder({ id: 't1', city: 'City 1', positionIndex: 3 });
      const t2 = territoryMockBuilder({ id: 't2', city: 'City 1', positionIndex: 0 });
      territoryRepository.getAllByCongregationAndCities.mockReturnValue(of([t1, t2]));
      territoryRepository.getNextPositionIndexForCity.mockReturnValue(of(5));
      territoryRepository.batchUpdate.mockReturnValue(of(undefined));

      await lastValueFrom(service.removeCity('City 1', { action: 'transfer', targetCity: 'City 2' }));

      expect(territoryRepository.getNextPositionIndexForCity).toHaveBeenCalledWith('City 2');
      expect(territoryRepository.batchUpdate).toHaveBeenCalledWith([
        { ...t2, city: 'City 2', positionIndex: 5 },
        { ...t1, city: 'City 2', positionIndex: 6 },
      ]);
      expect(congregationRepository.update).toHaveBeenCalledWith({
        ...congregationMock,
        cities: ['City 2', 'City 3'],
      });
      expect(userState.currentUser?.congregation?.cities).toEqual(['City 2', 'City 3']);
    });

    it('deletes all territories and their history via batchDelete and removes the city', async () => {
      congregationRepository.update.mockReturnValue(of(undefined));
      const t1 = territoryMockBuilder({ id: 't1', city: 'City 1' });
      const t2 = territoryMockBuilder({ id: 't2', city: 'City 1' });
      territoryRepository.getAllByCongregationAndCities.mockReturnValue(of([t1, t2]));
      territoryRepository.batchDelete.mockReturnValue(of(undefined));

      await lastValueFrom(service.removeCity('City 1', { action: 'delete' }));

      expect(territoryRepository.batchDelete).toHaveBeenCalledWith(['t1', 't2']);
      expect(congregationRepository.update).toHaveBeenCalledWith({
        ...congregationMock,
        cities: ['City 2', 'City 3'],
      });
      expect(userState.currentUser?.congregation?.cities).toEqual(['City 2', 'City 3']);
    });
  });

  describe('createCongregation', () => {
    it('creates the congregation and switches the APP_ADMIN active congregation in UserStateService', async () => {
      const appAdmin = userMockBuilder({
        id: 'app-admin-1',
        role: RoleEnum.APP_ADMIN,
        congregation: congregationMock,
      });
      userState.setUser(appAdmin);

      const newCongData: Omit<Congregation, 'id'> = {
        name: 'Congregação Sul',
        locatedOn: 'Santos, SP',
        cities: ['Santos', 'São Vicente'],
        settings: {
          designationAccessExpiryDays: 30,
          shouldDesignationBlockAfterExpired: true,
        },
      };
      const createdCong: Congregation = { ...newCongData, id: 'cong-new-1' };

      congregationRepository.add.mockReturnValue(of(createdCong));
      profileBO.changeUserCongregation.mockReturnValue(of({ ...appAdmin, congregation: createdCong }));

      const result = await lastValueFrom(service.createCongregation(newCongData));

      expect(congregationRepository.add).toHaveBeenCalledWith(newCongData);
      expect(profileBO.changeUserCongregation).toHaveBeenCalledWith('app-admin-1', 'cong-new-1');
      expect(result).toEqual(createdCong);
      expect(userState.currentUser?.congregation).toEqual(createdCong);
    });
  });
});
