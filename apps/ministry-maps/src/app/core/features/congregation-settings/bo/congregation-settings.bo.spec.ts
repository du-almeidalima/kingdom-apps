import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { CongregationSettingsBO } from './congregation-settings.bo';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { congregationMock } from '../../../../../test/mocks';
import { userMockBuilder } from '../../../../../test/mocks';
import { Congregation, CongregationSettings } from '../../../../../models/congregation';
import { environment } from '../../../../../environments/environment';

/** Runtime-realistic partial settings: Firestore docs may predate the settings feature (see BO @todo). */
const partialSettings = (settings: object) => settings as CongregationSettings;

describe('CongregationSettingsBO', () => {
  let bo: CongregationSettingsBO;
  let userState: UserStateService;
  let loggerService: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CongregationSettingsBO,
        MockProvider(LoggerService),
        {
          provide: UserStateService,
          useFactory: () => {
            const userStateServiceMock = new UserStateService();
            userStateServiceMock.setUser(userMockBuilder({ congregation: congregationMock }));

            return userStateServiceMock;
          },
        },
      ],
    });

    bo = TestBed.inject(CongregationSettingsBO);
    userState = TestBed.inject(UserStateService);
    loggerService = TestBed.inject(LoggerService);
  });

  describe('getCongregationSettings', () => {
    it('returns the congregation settings for the current user', () => {
      expect(bo.getCongregationSettings()).toEqual(congregationMock.settings);
    });

    it.each([
      ['no user', null],
      ['user without congregation', userMockBuilder({ congregation: undefined })],
    ])('returns undefined and logs an error when there is %s', (_desc, user) => {
      userState.setUser(user);

      expect(bo.getCongregationSettings()).toBeUndefined();
      expect(loggerService.error).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    });
  });

  describe('getSettingOrDefault', () => {
    it('returns the stored value when the congregation defines it', () => {
      userState.setUser(
        userMockBuilder({
          congregation: {
            ...congregationMock,
            settings: { designationAccessExpiryDays: 30, shouldDesignationBlockAfterExpired: true },
          },
        }),
      );

      expect(bo.getSettingOrDefault('designationAccessExpiryDays')).toBe(30);
      expect(bo.getSettingOrDefault('shouldDesignationBlockAfterExpired')).toBe(true);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
    ])('falls back to the environment default when the setting is %s', (_desc, storedValue) => {
      userState.setUser(
        userMockBuilder({
          congregation: {
            ...congregationMock,
            settings: partialSettings({ designationAccessExpiryDays: storedValue }),
          },
        }),
      );

      expect(bo.getSettingOrDefault('designationAccessExpiryDays')).toBe(
        environment.congregationSettingsDefaultValues.designationAccessExpiryDays,
      );
    });

    it('falls back to the environment default when the congregation has no settings at all', () => {
      userState.setUser(
        userMockBuilder({ congregation: { ...congregationMock, settings: undefined } as unknown as Congregation }),
      );

      expect(bo.getSettingOrDefault('designationAccessExpiryDays')).toBe(45);
      expect(bo.getSettingOrDefault('shouldDesignationBlockAfterExpired')).toBe(false);
    });

    it('keeps an explicit false instead of replacing it with the default', () => {
      userState.setUser(
        userMockBuilder({
          congregation: {
            ...congregationMock,
            settings: partialSettings({ shouldDesignationBlockAfterExpired: false }),
          },
        }),
      );

      expect(bo.getSettingOrDefault('shouldDesignationBlockAfterExpired')).toBe(false);
    });
  });
});
