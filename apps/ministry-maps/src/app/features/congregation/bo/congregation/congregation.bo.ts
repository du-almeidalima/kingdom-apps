import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';
import { UserStateService } from '../../../../state/user.state.service';
import { CongregationRepository } from '../../../../repositories/congregation.repository';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { ProfileBO } from '../../../profile/bo/profile.bo';
import { type Congregation } from '../../../../../models/congregation';
import { Territory } from '../../../../../models/territory';
import { User } from '../../../../../models/user';

export type RemoveCityResolution =
  | { action: 'transfer'; targetCity: string }
  | { action: 'delete' };

@Injectable({ providedIn: 'root' })
export class CongregationBO {
  private readonly userState = inject(UserStateService);
  private readonly congregationRepository = inject(CongregationRepository);
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly profileBO = inject(ProfileBO);
  private readonly loggerService = inject(LoggerService);

  createCongregation(data: Omit<Congregation, 'id'>): Observable<Congregation> {
    const user = this.userState.currentUser;
    if (!user) {
      return throwError(() => new Error('No User found while creating congregation.'));
    }

    const trimmedName = data.name?.trim() ?? '';
    const trimmedLocation = data.locatedOn?.trim() ?? '';
    if (!trimmedName) {
      return throwError(() => new Error('Congregation name cannot be empty.'));
    }
    if (!trimmedLocation) {
      return throwError(() => new Error('Congregation location cannot be empty.'));
    }

    const trimmedCities = (data.cities ?? []).map((c) => c.trim()).filter(Boolean);
    if (trimmedCities.length === 0) {
      return throwError(() => new Error('At least one city is required.'));
    }

    const seen = new Set<string>();
    for (const city of trimmedCities) {
      const normalized = city.toLowerCase();
      if (seen.has(normalized)) {
        return throwError(() => new Error(`Duplicate city name: ${city}`));
      }
      seen.add(normalized);
    }

    const payload: Omit<Congregation, 'id'> = {
      ...data,
      name: trimmedName,
      locatedOn: trimmedLocation,
      cities: trimmedCities,
    };

    return this.congregationRepository.add(payload).pipe(
      switchMap((createdCongregation) =>
        this.profileBO.changeUserCongregation(user.id, createdCongregation.id).pipe(
          tap((updatedUser) => {
            this.userState.setUser({
              ...(updatedUser ?? user),
              congregation: { ...createdCongregation, cities: [...createdCongregation.cities] },
            });
          }),
          map(() => createdCongregation),
        ),
      ),
      catchError((error) => {
        this.loggerService.error('Error creating congregation: ' + error);
        return throwError(() => error);
      }),
    );
  }

  updateCongregationName(newName: string): Observable<void> {
    const context = this.requireContext('updating congregation name');
    const trimmedName = newName?.trim() ?? '';

    if (!trimmedName) {
      return throwError(() => new Error('Congregation name cannot be empty.'));
    }

    const updatedCongregation: Congregation = {
      ...context.congregation,
      cities: [...context.congregation.cities],
      name: trimmedName,
    };

    return this.congregationRepository.update(updatedCongregation).pipe(
      tap(() => {
        this.loggerService.info(
          `Congregation [${context.congregation.name}] (${context.congregation.id}) renamed to [${trimmedName}] by User [${context.user.name}] (${context.user.id}).`,
        );
        this.syncUserCongregation(context.user, updatedCongregation);
      }),
      catchError((error) => {
        this.loggerService.error('Error updating congregation name: ' + error);
        return throwError(() => error);
      }),
    );
  }

  addCity(cityName: string): Observable<void> {
    const context = this.requireContext('adding congregation city');
    const trimmedCity = cityName?.trim() ?? '';

    if (!trimmedCity) {
      return throwError(() => new Error('New city name cannot be empty.'));
    }

    const existingCities = context.congregation.cities ?? [];
    const normalizedNew = trimmedCity.toLowerCase();
    if (existingCities.some((c) => c.trim().toLowerCase() === normalizedNew)) {
      return throwError(() => new Error(`City already exists in congregation: ${trimmedCity}`));
    }

    const updatedCongregation: Congregation = {
      ...context.congregation,
      cities: [...existingCities, trimmedCity],
    };

    return this.congregationRepository.update(updatedCongregation).pipe(
      tap(() => {
        this.loggerService.info(
          `Congregation [${context.congregation.name}] (${context.congregation.id}) added city [${trimmedCity}] by User [${context.user.name}] (${context.user.id}).`,
        );
        this.syncUserCongregation(context.user, updatedCongregation);
      }),
      catchError((error) => {
        this.loggerService.error('Error adding congregation city: ' + error);
        return throwError(() => error);
      }),
    );
  }

  renameCity(oldCityName: string, newCityName: string): Observable<void> {
    const context = this.requireContext('renaming congregation city');
    const trimmedNewCity = newCityName?.trim() ?? '';

    if (!trimmedNewCity) {
      return throwError(() => new Error('New city name cannot be empty.'));
    }

    const existingCities = context.congregation.cities ?? [];
    const oldIndex = existingCities.indexOf(oldCityName);
    if (oldIndex === -1) {
      return throwError(() => new Error(`City not found in congregation: ${oldCityName}`));
    }

    const normalizedNew = trimmedNewCity.toLowerCase();
    const hasCollision = existingCities.some(
      (c, index) => index !== oldIndex && c.trim().toLowerCase() === normalizedNew,
    );
    if (hasCollision) {
      return throwError(() => new Error(`City already exists in congregation: ${trimmedNewCity}`));
    }

    const updatedCities = existingCities.map((c, index) => (index === oldIndex ? trimmedNewCity : c));
    const updatedCongregation: Congregation = {
      ...context.congregation,
      cities: updatedCities,
    };

    const congregationUpdate$ = this.congregationRepository.update(updatedCongregation);
    const territoryUpdate$ =
      oldCityName === trimmedNewCity
        ? of(undefined)
        : this.territoryRepository.getAllByCongregationAndCities(context.congregation.id, [oldCityName]).pipe(
            take(1),
            switchMap((territories) => {
              const updatedTerritories = territories
                .filter((t) => t.city === oldCityName)
                .map((territory) => ({
                  ...territory,
                  city: trimmedNewCity,
                }));

              if (updatedTerritories.length === 0) {
                return of(undefined);
              }

              return this.territoryRepository.batchUpdate(updatedTerritories);
            }),
          );

    return forkJoin([congregationUpdate$, territoryUpdate$]).pipe(
      tap(() => {
        this.loggerService.info(
          `Congregation [${context.congregation.name}] (${context.congregation.id}) renamed city from [${oldCityName}] to [${trimmedNewCity}] by User [${context.user.name}] (${context.user.id}).`,
        );
        this.syncUserCongregation(context.user, updatedCongregation);
      }),
      map(() => undefined),
      catchError((error) => {
        this.loggerService.error('Error renaming congregation city: ' + error);
        return throwError(() => error);
      }),
    );
  }

  reorderCities(cities: string[]): Observable<void> {
    const context = this.requireContext('reordering congregation cities');
    const updatedCongregation: Congregation = {
      ...context.congregation,
      cities: [...cities],
    };

    return this.congregationRepository.update(updatedCongregation).pipe(
      tap(() => {
        this.syncUserCongregation(context.user, updatedCongregation);
      }),
      catchError((error) => {
        this.loggerService.error('Error reordering congregation cities: ' + error);
        return throwError(() => error);
      }),
    );
  }

  removeCity(cityName: string, resolution: RemoveCityResolution): Observable<void> {
    const context = this.requireContext('removing congregation city');
    const existingCities = context.congregation.cities ?? [];
    if (!existingCities.includes(cityName)) {
      return throwError(() => new Error(`City not found in congregation: ${cityName}`));
    }

    const updatedCities = existingCities.filter((c) => c !== cityName);
    if (resolution.action === 'transfer' && (!resolution.targetCity || !updatedCities.includes(resolution.targetCity))) {
      return throwError(() => new Error(`Invalid target city for transfer: ${resolution.targetCity}`));
    }

    const updatedCongregation: Congregation = {
      ...context.congregation,
      cities: updatedCities,
    };

    const territoryAction$: Observable<void> =
      resolution.action === 'transfer'
        ? forkJoin([
            this.territoryRepository.getAllByCongregationAndCities(context.congregation.id, [cityName]).pipe(take(1)),
            this.territoryRepository.getNextPositionIndexForCity(resolution.targetCity).pipe(take(1)),
          ]).pipe(
            switchMap(([territories, nextPositionIndex]) => {
              const matching = territories
                .filter((t) => t.city === cityName)
                .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));

              if (matching.length === 0) {
                return of(undefined);
              }

              const transferred: Territory[] = matching.map((territory, idx) => ({
                ...territory,
                city: resolution.targetCity,
                positionIndex: nextPositionIndex + idx,
              }));

              return this.territoryRepository.batchUpdate(transferred);
            }),
          )
        : this.territoryRepository.getAllByCongregationAndCities(context.congregation.id, [cityName]).pipe(
            take(1),
            switchMap((territories) => {
              const idsToDelete = territories.filter((t) => t.city === cityName).map((t) => t.id);
              if (idsToDelete.length === 0) {
                return of(undefined);
              }

              return this.territoryRepository.batchDelete(idsToDelete);
            }),
          );

    return forkJoin([this.congregationRepository.update(updatedCongregation), territoryAction$]).pipe(
      tap(() => {
        this.loggerService.info(
          `Congregation [${context.congregation.name}] (${context.congregation.id}) removed city [${cityName}] (${resolution.action}) by User [${context.user.name}] (${context.user.id}).`,
        );
        this.syncUserCongregation(context.user, updatedCongregation);
      }),
      map(() => undefined),
      catchError((error) => {
        this.loggerService.error('Error removing congregation city: ' + error);
        return throwError(() => error);
      }),
    );
  }

  private requireContext(operation: string): { user: User; congregation: Congregation } {
    const user = this.userState.currentUser;
    const congregation = user?.congregation;

    if (!congregation || !user) {
      throw new Error(`No User or Congregation found while ${operation}.`);
    }

    return { user, congregation };
  }

  private syncUserCongregation(user: User, updatedCongregation: Congregation): void {
    const latestUser = this.userState.currentUser ?? user;
    this.userState.setUser({
      ...latestUser,
      congregation: {
        ...updatedCongregation,
        cities: [...updatedCongregation.cities],
      },
    });
  }
}
