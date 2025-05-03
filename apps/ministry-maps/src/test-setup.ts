import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import './test/setup-test-mocks';

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
