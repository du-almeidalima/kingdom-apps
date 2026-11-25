import { TestBed } from '@angular/core/testing';
import { CITY_LOCATOR_STORAGE_KEY, CityLocatorService } from './city-locator.service';
import { UserStateService } from '../../../state/user.state.service';
import { ALL_OPTION } from '../../utils/territories-filter-pipe';
import { userMockBuilder, congregationMock } from '../../../../test/mocks';

describe('CityLocatorService', () => {
  let service: CityLocatorService;
  let userState: UserStateService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [CityLocatorService, UserStateService],
    });

    service = TestBed.inject(CityLocatorService);
    userState = TestBed.inject(UserStateService);
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('should be created with initial state', () => {
    expect(service).toBeTruthy();
    expect(service.isLoading()).toBe(false);
    expect(service.resolvedCity()).toBeNull();
  });

  describe('single-city fast path', () => {
    it('should immediately resolve the single city without calling fetch', () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch');
      const congregation = { ...congregationMock, cities: ['Cosmópolis'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
      expect(service.resolvedCity()).toBe('Cosmópolis');
    });

    it('should fall back to ALL_OPTION if congregation has empty cities array', () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch');
      const congregation = { ...congregationMock, cities: [] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.resolvedCity()).toBe(ALL_OPTION);
    });

    it('should reset resolvedCity to null when user logs out', () => {
      const congregation = { ...congregationMock, cities: ['Cosmópolis'] };
      userState.setUser(userMockBuilder({ congregation }));
      TestBed.flushEffects();
      expect(service.resolvedCity()).toBe('Cosmópolis');

      userState.setUser(null);
      TestBed.flushEffects();

      expect(service.resolvedCity()).toBeNull();
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('multi-city background lookup', () => {
    it('should set isLoading while fetching, normalize city names, and match case/diacritic-insensitively', async () => {
      let resolveFetch!: (val: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      const fetchMock = jest.spyOn(globalThis, 'fetch').mockReturnValueOnce(fetchPromise);

      const congregation = { ...congregationMock, cities: ['Osasco', 'São Paulo'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      expect(fetchMock).toHaveBeenCalledWith('https://freeipapi.com/api/json', {
        signal: expect.any(AbortSignal),
      });
      expect(service.isLoading()).toBe(true);

      resolveFetch({
        ok: true,
        json: async () => ({ cityName: 'sao paulo' }),
      } as Response);

      await Promise.resolve();
      await Promise.resolve();

      expect(service.isLoading()).toBe(false);
      expect(service.resolvedCity()).toBe('São Paulo');
      expect(sessionStorage.getItem(CITY_LOCATOR_STORAGE_KEY)).toBe('sao paulo');
    });

    it('should fall back to cities[0] when detected city is not in congregation cities', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cityName: 'Rio de Janeiro' }),
      } as Response);

      const congregation = { ...congregationMock, cities: ['Artur Nogueira', 'Cosmópolis'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      await Promise.resolve();
      await Promise.resolve();

      expect(service.isLoading()).toBe(false);
      expect(service.resolvedCity()).toBe('Artur Nogueira');
    });

    it('should fall back to cities[0] when fetch rejects with network error or timeout', async () => {
      jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network timeout'));

      const congregation = { ...congregationMock, cities: ['Limeira', 'Americana'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      await Promise.resolve();
      await Promise.resolve();

      expect(service.isLoading()).toBe(false);
      expect(service.resolvedCity()).toBe('Limeira');
    });

    it('should fall back to cities[0] when response is not ok', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const congregation = { ...congregationMock, cities: ['Santos', 'Guarujá'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      await Promise.resolve();
      await Promise.resolve();

      expect(service.isLoading()).toBe(false);
      expect(service.resolvedCity()).toBe('Santos');
    });
  });

  describe('sessionStorage cache', () => {
    it('should resolve synchronously from sessionStorage without calling fetch', () => {
      sessionStorage.setItem(CITY_LOCATOR_STORAGE_KEY, 'sao paulo');
      const fetchSpy = jest.spyOn(globalThis, 'fetch');

      const congregation = { ...congregationMock, cities: ['Osasco', 'São Paulo'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
      expect(service.resolvedCity()).toBe('São Paulo');
    });

    it('should fall back to cities[0] when cached city is not in congregation cities without calling fetch', () => {
      sessionStorage.setItem(CITY_LOCATOR_STORAGE_KEY, 'Rio de Janeiro');
      const fetchSpy = jest.spyOn(globalThis, 'fetch');

      const congregation = { ...congregationMock, cities: ['Artur Nogueira', 'Cosmópolis'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
      expect(service.resolvedCity()).toBe('Artur Nogueira');
    });

    it('should not cache failed fetch lookups', async () => {
      jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const congregation = { ...congregationMock, cities: ['Limeira', 'Americana'] };
      const user = userMockBuilder({ congregation });

      userState.setUser(user);
      TestBed.flushEffects();

      await Promise.resolve();
      await Promise.resolve();

      expect(sessionStorage.getItem(CITY_LOCATOR_STORAGE_KEY)).toBeNull();
      expect(service.resolvedCity()).toBe('Limeira');
    });
  });
});
