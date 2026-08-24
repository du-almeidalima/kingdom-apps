import { signal } from '@angular/core';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { AppComponent } from './app.component';
import { AuthService } from './core/features/auth/services/auth.service';

describe('AppComponent', () => {
  const isAuthenticating = signal(false);

  beforeEach(() => {
    isAuthenticating.set(false);
    return MockBuilder(AppComponent).provide({
      provide: AuthService,
      useValue: { isAuthenticating },
    });
  });

  it('renders the routed content when authentication is settled', () => {
    const fixture = MockRender(AppComponent);

    expect(ngMocks.find(fixture, 'router-outlet')).toBeTruthy();
    expect(ngMocks.find(fixture, '[data-testid="app-loading-spinner"]', undefined)).toBeUndefined();
  });

  it('shows the full-screen spinner while authenticating', () => {
    isAuthenticating.set(true);
    const fixture = MockRender(AppComponent);

    expect(ngMocks.find(fixture, '[data-testid="app-loading-spinner"]')).toBeTruthy();
    expect(ngMocks.find(fixture, 'router-outlet', undefined)).toBeUndefined();
  });
});
