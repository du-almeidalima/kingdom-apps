import { inject, Injectable } from '@angular/core';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { tap } from 'rxjs';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';

@Injectable()
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
        );
      }),
    );
  }
}
