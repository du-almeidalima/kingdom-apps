import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
import { ngMocks } from 'ng-mocks';

// auto spy
ngMocks.autoSpy('jest');

import { DefaultTitleStrategy, TitleStrategy } from '@angular/router';
import { MockService } from 'ng-mocks';

ngMocks.defaultMock(TitleStrategy, () => MockService(DefaultTitleStrategy));

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
