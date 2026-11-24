import { effect, inject, Injectable, signal } from '@angular/core';
import { UserStateService } from '../../../state/user.state.service';
import { ALL_OPTION } from '../../utils/territories-filter-pipe';

export const FREE_IP_API_URL = 'https://freeipapi.com/api/json';
export const IP_API_TIMEOUT_MS = 1500;
export const CITY_LOCATOR_STORAGE_KEY = 'ministry-maps:detected-city';

/**
 * Root singleton service that identifies the user's city via IP geolocation
 * to pre-select their congregation's primary working city in territory views.
 */
@Injectable({
  providedIn: 'root',
})
export class CityLocatorService {
  private readonly userState = inject(UserStateService);

  /** Whether the background IP geolocation request is currently in progress. */
  public readonly isLoading = signal<boolean>(false);

  /** The detected congregation city matching the user's location, or null if uninitialized. */
  public readonly resolvedCity = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.userState.user();
      const cities = user?.congregation?.cities;

      if (!cities) {
        this.resolvedCity.set(null);
        this.isLoading.set(false);
        return;
      }

      // Fast path: congregations covering at most one city require no network lookup.
      if (cities.length <= 1) {
        this.resolvedCity.set(cities[0] ?? ALL_OPTION);
        this.isLoading.set(false);
        return;
      }

      this.locateCity(cities);
    });
  }

  /**
   * Queries the keyless IP geolocation API (or reads from sessionStorage cache) to match
   * the client's city against congregation cities. Falls back silently to the first city
   * on timeout or error.
   */
  private async locateCity(cities: string[]): Promise<void> {
    const cachedCity = this.getCachedCity();
    if (cachedCity !== null) {
      const matched = cachedCity ? this.matchCity(cachedCity, cities) : undefined;
      this.resolvedCity.set(matched ?? cities[0] ?? ALL_OPTION);
      this.isLoading.set(false);
      return;
    }

    this.resolvedCity.set(null);
    this.isLoading.set(true);
    let matched: string | undefined;

    try {
      const response = await fetch(FREE_IP_API_URL, {
        signal: AbortSignal.timeout(IP_API_TIMEOUT_MS),
      });

      if (response.ok) {
        const data = (await response.json()) as { cityName?: string };
        const rawCity = data.cityName?.trim();

        if (rawCity) {
          this.setCachedCity(rawCity);
          matched = this.matchCity(rawCity, cities);
        }
      }
    } catch {
      // Network failure, timeout, or parsing error falls through to default fallback.
    } finally {
      this.resolvedCity.set(matched ?? cities[0] ?? ALL_OPTION);
      this.isLoading.set(false);
    }
  }

  private getCachedCity(): string | null {
    try {
      return sessionStorage.getItem(CITY_LOCATOR_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private setCachedCity(city: string): void {
    try {
      sessionStorage.setItem(CITY_LOCATOR_STORAGE_KEY, city);
    } catch {
      // Ignore storage errors (e.g. private browsing restrictions).
    }
  }

  /**
   * Matches the detected municipality against available congregation cities,
   * ignoring diacritics/accents and letter casing.
   */
  private matchCity(targetCity: string, availableCities: string[]): string | undefined {
    const normalize = (val: string) =>
      val
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    const normalizedTarget = normalize(targetCity);
    return availableCities.find((c) => normalize(c) === normalizedTarget);
  }
}
