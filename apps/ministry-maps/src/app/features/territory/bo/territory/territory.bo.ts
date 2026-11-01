import { inject, Injectable } from '@angular/core';
import { of, tap } from 'rxjs';
import { TerritoryRepository, TerritoryUpdate } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { Territory } from '../../../../../models/territory';

@Injectable({ providedIn: 'root' })
export class TerritoryBO {
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly userStateService = inject(UserStateService);
  private readonly loggerService = inject(LoggerService);

  public deleteTerritory(territoryId: string) {
    return this.territoryRepository.delete(territoryId).pipe(
      tap(() => {
        const user = this.userStateService.currentUser;
        const congregation = user?.congregation;

        this.loggerService.info(
          `Congregation [${congregation?.name}] (${congregation?.id}) deleted Territory [${territoryId}] by User [${user?.name}] (${user?.id}).`,
          {
            userId: user?.id ?? null,
            userEmail: user?.email ?? null,
            congregationId: congregation?.id ?? null,
          },
        );
      }),
    );
  }

  public updateTerritory(territory: TerritoryUpdate) {
    return this.territoryRepository.update(territory).pipe(
      tap(() => {
        const user = this.userStateService.currentUser;
        const congregation = user?.congregation;

        this.loggerService.info(
          `Congregation [${congregation?.name}] (${congregation?.id}) updated Territory [${territory.id}] by User [${user?.name}] (${user?.id}).`,
          {
            userId: user?.id ?? null,
            userEmail: user?.email ?? null,
            congregationId: congregation?.id ?? null,
          },
        );
      }),
    );
  }

  public batchUpdateTerritories(territories: Territory[]) {
    if (!territories || territories.length === 0) {
      return of(undefined);
    }

    return this.territoryRepository.batchUpdate(territories).pipe(
      tap(() => {
        const user = this.userStateService.currentUser;
        const congregation = user?.congregation;

        this.loggerService.info(
          `Congregation [${congregation?.name}] (${congregation?.id}) batch updated ${territories.length} territories by User [${user?.name}] (${user?.id}).`,
          {
            userId: user?.id ?? null,
            userEmail: user?.email ?? null,
            congregationId: congregation?.id ?? null,
          },
        );
      }),
    );
  }
}
