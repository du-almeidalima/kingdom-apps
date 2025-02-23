import { inject, Injectable } from '@angular/core';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { CongregationSettings } from '../../../../../models/congregation';
import { environment } from '../../../../../environments/environment';

/** Handles the business logic for configuring the Congregation Settings */
@Injectable({providedIn: 'root'})
export class CongregationSettingsBO {
  userStateService = inject(UserStateService);
  loggerService = inject(LoggerService);

  /**
   * Retrieves the settings for the current user's congregation.
   * @return {object|undefined} The congregation settings if available, otherwise undefined.
   */
  public getCongregationSettings(): CongregationSettings | undefined {
    const congregation = this.userStateService.currentUser?.congregation;
    if (!congregation) {
      this.loggerService.error('No congregation found', {
        currentUser: this.userStateService.currentUser,
        class: CongregationSettingsBO.name,
      });

      return;
    }

    return congregation?.settings;
  }

  /**
   * Tries to get the {@link CongregationSettings} value for this {@link Congregation}.
   * If no value is found, returns the default value set on {@link environment.congregationSettingsDefaultValues}.
   *
   * @todo Ideally, each congregation should have the settings object populated for it. However, this requires
   * developing a mechanism to do database migrations. For the moment, we'll rely on default values set in the
   * environment file.
   */
  public getSettingOrDefault(setting: keyof CongregationSettings): any {
    const settings = this.getCongregationSettings();
    const value = settings?.[setting];

    return value ?? environment.congregationSettingsDefaultValues[setting];
  }
}
