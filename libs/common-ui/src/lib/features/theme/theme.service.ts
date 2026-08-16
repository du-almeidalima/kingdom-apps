import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';

import { BROWSER_WINDOW } from './browser-window.token';
import { THEME_CONFIG } from './theme.config';
import {
  DARK_MODE_QUERY,
  DEFAULT_THEME_COLOR_META_SELECTOR,
  DEFAULT_THEME_STORAGE_KEY,
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from './theme.constants';
import { ResolvedTheme, ThemePreference, isThemePreference } from './theme.types';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly window = inject(BROWSER_WINDOW);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config = inject(THEME_CONFIG);

  private readonly storageKey = this.config.storageKey ?? DEFAULT_THEME_STORAGE_KEY;
  private readonly metaSelector = this.config.metaSelector ?? DEFAULT_THEME_COLOR_META_SELECTOR;
  private readonly metaColors = this.config.metaColors;

  private readonly _preference = signal<ThemePreference>('system');
  private readonly _isSystemDark = signal<boolean>(false);
  private isInitialized = false;

  readonly preference: Signal<ThemePreference> = this._preference.asReadonly();
  readonly resolvedTheme: Signal<ResolvedTheme> = computed(() => {
    const pref = this._preference();
    if (pref === 'light') {
      return 'light';
    }
    if (pref === 'dark') {
      return 'dark';
    }
    return this._isSystemDark() ? 'dark' : 'light';
  });

  initialize(): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    const windowRef = this.window;
    let initialPref: ThemePreference = this.config.defaultPreference ?? 'system';

    if (windowRef) {
      try {
        const stored = windowRef.localStorage.getItem(this.storageKey);
        if (isThemePreference(stored)) {
          initialPref = stored;
        }
      } catch {
        // Degraded/blocked storage falls back to default
      }
    }

    this._preference.set(initialPref);

    let systemDark = false;
    let mediaQueryList: MediaQueryList | null = null;

    if (windowRef) {
      try {
        mediaQueryList = windowRef.matchMedia(DARK_MODE_QUERY);
        systemDark = mediaQueryList.matches;
      } catch {
        // matchMedia throws in restricted contexts — falls back to light
      }
    }
    this._isSystemDark.set(systemDark);

    this.applyTheme(this._preference(), this.resolvedTheme());

    if (mediaQueryList) {
      const mediaListener = (event: MediaQueryListEvent) => {
        this._isSystemDark.set(event.matches);
        this.applyTheme(this._preference(), this.resolvedTheme());
      };

      mediaQueryList.addEventListener('change', mediaListener);
      this.destroyRef.onDestroy(() => {
        mediaQueryList?.removeEventListener('change', mediaListener);
      });
    }

    if (windowRef) {
      const storageListener = (event: StorageEvent) => {
        if (event.key !== this.storageKey) {
          return;
        }
        const newValue = event.newValue;
        const newPref: ThemePreference = isThemePreference(newValue)
          ? newValue
          : (this.config.defaultPreference ?? 'system');
        this._preference.set(newPref);
        this.applyTheme(newPref, this.resolvedTheme());
      };

      windowRef.addEventListener('storage', storageListener);
      this.destroyRef.onDestroy(() => {
        windowRef.removeEventListener('storage', storageListener);
      });
    }
  }

  setPreference(preference: ThemePreference): void {
    if (!isThemePreference(preference)) {
      throw new Error(`Invalid theme preference: ${preference}`);
    }

    this._preference.set(preference);
    this.applyTheme(preference, this.resolvedTheme());

    const windowRef = this.window;
    if (windowRef) {
      try {
        windowRef.localStorage.setItem(this.storageKey, preference);
      } catch {
        // Keep in-memory preference even if storage write fails
      }
    }
  }

  private applyTheme(preference: ThemePreference, resolved: ResolvedTheme): void {
    const doc = this.document;
    if (!doc) {
      return;
    }

    const root = doc.documentElement;
    if (root) {
      root.setAttribute(THEME_ATTRIBUTE, preference);
      root.setAttribute(RESOLVED_THEME_ATTRIBUTE, resolved);
      root.style.colorScheme = resolved;
    }

    if (this.metaColors) {
      const meta = doc.querySelector<HTMLMetaElement>(this.metaSelector);
      if (meta) {
        meta.content = this.metaColors[resolved];
      }
    }
  }
}
