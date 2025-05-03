import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { ngMocks } from 'ng-mocks';

// auto spy
ngMocks.autoSpy('jest');

import { DefaultTitleStrategy, TitleStrategy } from '@angular/router';
import { MockService } from 'ng-mocks';

ngMocks.defaultMock(TitleStrategy, () => MockService(DefaultTitleStrategy));

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
