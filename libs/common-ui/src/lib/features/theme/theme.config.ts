import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { ThemeService } from './theme.service';
import { ThemePreference } from './theme.types';

export interface ThemeConfig {
  /** LocalStorage key used to persist the preference. Defaults to 'kui.theme-preference' */
  storageKey?: string;
  /** Browser chrome colors for mobile devices */
  metaColors?: {
    light: string;
    dark: string;
  };
  /** Selector for the <meta name="theme-color"> tag. Defaults to 'meta[name="theme-color"]' */
  metaSelector?: string;
  /** Fallback preference if nothing is stored. Defaults to 'system' */
  defaultPreference?: ThemePreference;
}

export const THEME_CONFIG = new InjectionToken<ThemeConfig>('THEME_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});

/**
 * Configures and initializes ThemeService at the application bootstrap.
 */
export function provideTheme(config?: ThemeConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: THEME_CONFIG, useValue: config ?? {} },
    provideAppInitializer(() => inject(ThemeService).initialize()),
  ]);
}
