import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, take, throwError } from 'rxjs';
import { UserStateService } from '../../state/user.state.service';
import { CongregationRepository } from '../../repositories/congregation.repository';
import { TerritoryRepository } from '../../repositories/territories.repository';
import { LoggerService } from '../services/logger/logger.service';
import { type Congregation } from '../../../models/congregation';
import { Territory } from '../../../models/territory';

export interface UpdateCongregationCityDTO {
  /**
   * The current city name. This is null when it's a new city being added
   */
  oldCityName?: string;
  newCityName: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigurationBO {
  private userState = inject(UserStateService);
  private congregationRepository = inject(CongregationRepository);
  private territoryRepository = inject(TerritoryRepository);
  private loggerService = inject(LoggerService);

  /**
   * Updates a city name in the congregation's city array and all associated territories.
   * When oldCityName is null, treats it as adding a new city to the congregation.
   */
  updateCongregationCities(updatedCongregationCities: UpdateCongregationCityDTO[]): Observable<void> {
    const user = this.userState.currentUser;
    const congregation = user?.congregation;

    if (!congregation || !user) {
      throw new Error('No User or Congregation found while updating congregation cities.');
    }

    // Validate input (also check for duplicates/collisions against existing congregation cities)
    try {
      this.validateUpdateCongregationCities(updatedCongregationCities, congregation.cities ?? []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.loggerService.error('Error validating update congregation cities:' + err.message);
        return throwError(() => err);
      } else {
        this.loggerService.error('Unknown error validating update congregation cities:' + err);
        return throwError(() => new Error(String(err)));
      }
    }

    // Logging
    updatedCongregationCities.forEach((updatedCity) => {
      if (updatedCity.oldCityName) {
        this.loggerService.info(
          `Congregation [${congregation.name}] (${congregation.id}) renamed city from [${updatedCity.oldCityName}] to [${updatedCity.newCityName}] by User [${user.name}] (${user.id}).`
        );
      } else {
        this.loggerService.info(
          `Congregation [${congregation.name}] (${congregation.id}) added city [${updatedCity.newCityName}] by User [${user.name}] (${user.id}).`
        );
      }
    });

    // Update Congregation
    const cities = updatedCongregationCities.map((city) => city.newCityName);
    // structuredClone may not be available in the test/node environment; use a shallow clone instead
    const updatedCongregation: Congregation = { ...congregation, cities } as Congregation;

    const congregationUpdate$ = this.congregationRepository.update(updatedCongregation);

    // Update Territories
    const affectedTerritoriesUpdate$ = this.updateCitiesOfTerritory(updatedCongregationCities, congregation);

    // Run both updates in parallel using forkJoin
    return forkJoin([congregationUpdate$, affectedTerritoriesUpdate$]).pipe(
      map(() => undefined),
      catchError((error) => {
        this.loggerService.error('Error updating congregation cities: ' + error);
        return throwError(() => error);
      })
    );
  }

  private validateUpdateCongregationCities(updatedCities: UpdateCongregationCityDTO[], existingCities: string[] = []) {
    const normalizedExisting = new Set(existingCities.map((c) => c.trim().toLowerCase()));

    const seen = new Set<string>();

    for (const updatedCity of updatedCities) {
      if (!updatedCity.newCityName || updatedCity.newCityName.trim() === '') {
        throw new Error('New city name cannot be empty.');
      }

      const normalized = updatedCity.newCityName.trim().toLowerCase();

      if (seen.has(normalized)) {
        throw new Error(`Duplicate new city name in payload: ${updatedCity.newCityName}`);
      }

      seen.add(normalized);

      // If adding a new city, ensure it doesn't already exist in congregation (case-insensitive)
      if (!updatedCity.oldCityName && normalizedExisting.has(normalized)) {
        throw new Error(`City already exists in congregation: ${updatedCity.newCityName}`);
      }
    }
  }

  /**
   * Given a list of {@linkcode updatedCongregationCities} updates the territories affected by them.
   */
  private updateCitiesOfTerritory(
    updatedCongregationCities: UpdateCongregationCityDTO[],
    congregation: Congregation
  ): Observable<void> {
    // Gets only the cities that were renamed
    const renamedUpdatedCongregationCities = updatedCongregationCities.filter(
      (c) => !!c.oldCityName && c.oldCityName !== c.newCityName
    );

    const oldCities = renamedUpdatedCongregationCities.map((c) => c.oldCityName as string);

    // If there are no renames, nothing to update in territories.
    if (oldCities.length === 0) {
      return of(undefined);
    }

    const updatedCitiesMap = new Map<string, UpdateCongregationCityDTO>(
      renamedUpdatedCongregationCities.map((c) => [c.oldCityName as string, c])
    );

    return this.territoryRepository.getAllByCongregationAndCities(congregation.id, oldCities).pipe(
      take(1),
      switchMap((territories) => {
        const updatedTerritories = territories
          .map((territory) => {
            const cityUpdate = updatedCitiesMap.get(territory.city);

            if (cityUpdate && cityUpdate.newCityName && territory.city !== cityUpdate.newCityName) {
              return {
                ...territory,
                city: cityUpdate.newCityName,
              };
            }
            return null;
          })
          .filter((t): t is Territory => !!t);

        if (updatedTerritories.length === 0) {
          return of(undefined);
        }

        return this.territoryRepository.batchUpdate(updatedTerritories);
      })
    );
  }
}
