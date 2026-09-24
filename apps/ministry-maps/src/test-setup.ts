import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
import './test/setup-test-mocks';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
