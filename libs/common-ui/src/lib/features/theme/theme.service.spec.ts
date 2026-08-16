import { DOCUMENT } from '@angular/common';
import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BROWSER_WINDOW } from './browser-window.token';
import { THEME_CONFIG, ThemeConfig } from './theme.config';
import {
  DARK_MODE_QUERY,
  DEFAULT_THEME_COLOR_META_SELECTOR,
  DEFAULT_THEME_STORAGE_KEY,
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from './theme.constants';
import { ThemeService } from './theme.service';
import { ThemePreference } from './theme.types';

type StorageMap = Record<string, string>;

describe('ThemeService', () => {
  let doc: Document;
  let rootElement: HTMLElement;
  let metaElement: HTMLMetaElement;

  let mockStorage: StorageMap;
  let storageGetItemSpy: jest.Mock;
  let storageSetItemSpy: jest.Mock;

  let mediaListeners: Array<(e: { matches: boolean }) => void>;
  let mockMediaQueryList: {
    matches: boolean;
    media: string;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  let windowListeners: Record<string, Array<(e: any) => void>>;
  let mockWindow: any;
  let currentInjector: EnvironmentInjector | null = null;

  function createMockEnvironment(options?: {
    storage?: StorageMap;
    storageGetThrows?: boolean;
    storageSetThrows?: boolean;
    isDarkMedia?: boolean;
    matchMediaThrows?: boolean;
    hasMetaElement?: boolean;
    nullWindow?: boolean;
  }) {
    const opts = {
      storage: {},
      storageGetThrows: false,
      storageSetThrows: false,
      isDarkMedia: false,
      matchMediaThrows: false,
      hasMetaElement: true,
      nullWindow: false,
      ...options,
    };

    doc = document.implementation.createHTMLDocument('test');
    rootElement = doc.documentElement;

    if (opts.hasMetaElement) {
      metaElement = doc.createElement('meta');
      metaElement.setAttribute('name', 'theme-color');
      metaElement.content = '#E7E6E4';
      doc.head.appendChild(metaElement);
    }

    if (opts.nullWindow) {
      return { doc, mockWindow: null };
    }

    mockStorage = { ...opts.storage };
    storageGetItemSpy = jest.fn((key: string) => {
      if (opts.storageGetThrows) {
        throw new Error('Storage disabled');
      }
      return mockStorage[key] ?? null;
    });
    storageSetItemSpy = jest.fn((key: string, value: string) => {
      if (opts.storageSetThrows) {
        throw new Error('Quota exceeded');
      }
      mockStorage[key] = value;
    });

    mediaListeners = [];
    mockMediaQueryList = {
      matches: opts.isDarkMedia,
      media: DARK_MODE_QUERY,
      addEventListener: jest.fn((event: string, listener: any) => {
        if (event === 'change') {
          mediaListeners.push(listener);
        }
      }),
      removeEventListener: jest.fn((event: string, listener: any) => {
        if (event === 'change') {
          mediaListeners = mediaListeners.filter(l => l !== listener);
        }
      }),
    };

    windowListeners = {};
    mockWindow = {
      localStorage: {
        getItem: storageGetItemSpy,
        setItem: storageSetItemSpy,
      },
      matchMedia: jest.fn((_query: string) => {
        if (opts.matchMediaThrows) {
          throw new Error('matchMedia not supported');
        }
        return mockMediaQueryList;
      }),
      addEventListener: jest.fn((event: string, listener: any) => {
        if (!windowListeners[event]) {
          windowListeners[event] = [];
        }
        windowListeners[event].push(listener);
      }),
      removeEventListener: jest.fn((event: string, listener: any) => {
        if (windowListeners[event]) {
          windowListeners[event] = windowListeners[event].filter(l => l !== listener);
        }
      }),
    };

    return { doc, mockWindow };
  }

  function setupService(
    envOptions?: Parameters<typeof createMockEnvironment>[0],
    config?: ThemeConfig,
  ): ThemeService {
    const env = createMockEnvironment(envOptions);
    const parentInjector = TestBed.inject(EnvironmentInjector);

    currentInjector = createEnvironmentInjector(
      [
        ThemeService,
        { provide: DOCUMENT, useValue: env.doc },
        { provide: BROWSER_WINDOW, useValue: env.mockWindow },
        {
          provide: THEME_CONFIG,
          useValue: config ?? {
            metaColors: { light: '#E7E6E4', dark: '#121212' },
          },
        },
      ],
      parentInjector,
    );

    return currentInjector.get(ThemeService);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Default Configuration', () => {
    it('should initialize with default storage key and system preference', () => {
      const service = setupService({ isDarkMedia: false }, {});
      service.initialize();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('light');
      expect(storageGetItemSpy).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY);
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('light');
      expect(rootElement.style.colorScheme).toBe('light');
    });

    it('should persist preference under default storage key', () => {
      const service = setupService({}, {});
      service.initialize();
      service.setPreference('dark');

      expect(storageSetItemSpy).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark');
      expect(service.preference()).toBe('dark');
      expect(service.resolvedTheme()).toBe('dark');
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom storageKey and custom metaColors', () => {
      const service = setupService(
        { isDarkMedia: false },
        {
          storageKey: 'custom-app.theme',
          metaColors: { light: '#FFFFFF', dark: '#000000' },
          metaSelector: 'meta[name="theme-color"]',
        },
      );
      service.initialize();

      expect(storageGetItemSpy).toHaveBeenCalledWith('custom-app.theme');
      expect(metaElement.content).toBe('#FFFFFF');

      service.setPreference('dark');
      expect(storageSetItemSpy).toHaveBeenCalledWith('custom-app.theme', 'dark');
      expect(metaElement.content).toBe('#000000');
    });
  });

  describe('Theme Resolution & Storage', () => {
    it('Missing key, light OS -> Preference system, resolved light, root and meta correct, no write', () => {
      const service = setupService({ isDarkMedia: false });
      service.initialize();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('light');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('light');
      expect(rootElement.style.colorScheme).toBe('light');
      expect(metaElement.content).toBe('#E7E6E4');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Missing key, dark OS -> Preference system, resolved dark, root and meta correct', () => {
      const service = setupService({ isDarkMedia: true });
      service.initialize();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(rootElement.style.colorScheme).toBe('dark');
      expect(metaElement.content).toBe('#121212');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Stored system -> Retains system and resolves from media', () => {
      const service = setupService({
        storage: { [DEFAULT_THEME_STORAGE_KEY]: 'system' },
        isDarkMedia: true,
      });
      service.initialize();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Stored light -> Preference/resolution light under dark OS', () => {
      const service = setupService({
        storage: { [DEFAULT_THEME_STORAGE_KEY]: 'light' },
        isDarkMedia: true,
      });
      service.initialize();

      expect(service.preference()).toBe('light');
      expect(service.resolvedTheme()).toBe('light');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('light');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('light');
      expect(rootElement.style.colorScheme).toBe('light');
      expect(metaElement.content).toBe('#E7E6E4');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Stored dark -> Preference/resolution dark under light OS', () => {
      const service = setupService({
        storage: { [DEFAULT_THEME_STORAGE_KEY]: 'dark' },
        isDarkMedia: false,
      });
      service.initialize();

      expect(service.preference()).toBe('dark');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(rootElement.style.colorScheme).toBe('dark');
      expect(metaElement.content).toBe('#121212');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Invalid stored value -> Treat as system, resolve media, no throw', () => {
      const service = setupService({
        storage: { [DEFAULT_THEME_STORAGE_KEY]: 'neon-purple' },
        isDarkMedia: true,
      });
      service.initialize();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Storage read throws -> Safe fallback as missing key', () => {
      const service = setupService({
        storageGetThrows: true,
        isDarkMedia: true,
      });
      expect(() => service.initialize()).not.toThrow();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
    });
  });

  describe('setPreference API', () => {
    it('setPreference("system") -> Updates signal/root/meta, persists once, resolves media', () => {
      const service = setupService({
        storage: { [DEFAULT_THEME_STORAGE_KEY]: 'light' },
        isDarkMedia: true,
      });
      service.initialize();

      service.setPreference('system');

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(rootElement.style.colorScheme).toBe('dark');
      expect(metaElement.content).toBe('#121212');
      expect(storageSetItemSpy).toHaveBeenCalledTimes(1);
      expect(storageSetItemSpy).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'system');
    });

    it('setPreference("light") -> Immediate explicit light and one write under dark media', () => {
      const service = setupService({ isDarkMedia: true });
      service.initialize();

      service.setPreference('light');

      expect(service.preference()).toBe('light');
      expect(service.resolvedTheme()).toBe('light');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('light');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('light');
      expect(metaElement.content).toBe('#E7E6E4');
      expect(storageSetItemSpy).toHaveBeenCalledTimes(1);
      expect(storageSetItemSpy).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'light');
    });

    it('setPreference("dark") -> Immediate explicit dark and one write under light media', () => {
      const service = setupService({ isDarkMedia: false });
      service.initialize();

      service.setPreference('dark');

      expect(service.preference()).toBe('dark');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(metaElement.content).toBe('#121212');
      expect(storageSetItemSpy).toHaveBeenCalledTimes(1);
      expect(storageSetItemSpy).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark');
    });

    it('Runtime-invalid setter value -> Explicit programmer error', () => {
      const service = setupService();
      service.initialize();

      expect(() => service.setPreference('invalid-choice' as unknown as ThemePreference)).toThrow(
        'Invalid theme preference: invalid-choice',
      );
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Storage write throws -> Selected signal/root/meta remain applied without crashing', () => {
      const service = setupService({
        storageSetThrows: true,
        isDarkMedia: false,
      });
      service.initialize();

      expect(() => service.setPreference('dark')).not.toThrow();
      expect(service.preference()).toBe('dark');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(metaElement.content).toBe('#121212');
    });
  });

  describe('Live Media Query & Cross-Tab Events', () => {
    it('Media change while system -> Signals, root and meta update immediately', () => {
      const service = setupService({ isDarkMedia: false });
      service.initialize();

      expect(service.resolvedTheme()).toBe('light');
      expect(metaElement.content).toBe('#E7E6E4');

      mediaListeners.forEach(listener => listener({ matches: true }));

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(metaElement.content).toBe('#121212');
    });

    it('Media change while explicit light -> Stays light', () => {
      const service = setupService({
        storage: { [DEFAULT_THEME_STORAGE_KEY]: 'light' },
        isDarkMedia: false,
      });
      service.initialize();

      mediaListeners.forEach(listener => listener({ matches: true }));

      expect(service.preference()).toBe('light');
      expect(service.resolvedTheme()).toBe('light');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('light');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('light');
      expect(metaElement.content).toBe('#E7E6E4');
    });

    it('Valid storage event -> Matching key updates preference without writing back', () => {
      const service = setupService({ isDarkMedia: false });
      service.initialize();

      const storageEvent = new StorageEvent('storage', {
        key: DEFAULT_THEME_STORAGE_KEY,
        newValue: 'dark',
        oldValue: 'system',
      });

      windowListeners['storage']?.forEach(listener => listener(storageEvent));

      expect(service.preference()).toBe('dark');
      expect(service.resolvedTheme()).toBe('dark');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('dark');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Removed storage event -> Matching key with newValue=null becomes default system', () => {
      const service = setupService({
        storage: { [DEFAULT_THEME_STORAGE_KEY]: 'dark' },
        isDarkMedia: false,
      });
      service.initialize();

      const storageEvent = new StorageEvent('storage', {
        key: DEFAULT_THEME_STORAGE_KEY,
        newValue: null,
      });

      windowListeners['storage']?.forEach(listener => listener(storageEvent));

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('light');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('light');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('Unrelated storage event -> No change', () => {
      const service = setupService({ isDarkMedia: false });
      service.initialize();

      const storageEvent = new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: 'dark',
      });

      windowListeners['storage']?.forEach(listener => listener(storageEvent));

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('light');
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle & Edge Cases', () => {
    it('Repeated initialize() -> Executes once', () => {
      const service = setupService({ isDarkMedia: false });
      service.initialize();
      service.initialize();

      expect(storageGetItemSpy).toHaveBeenCalledTimes(1);
    });

    it('Destroy cleanup -> Removes registered media and storage listeners', () => {
      const service = setupService();
      service.initialize();

      currentInjector?.destroy();

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('Null defaultView -> Safe fallback for SSR environments', () => {
      const service = setupService({ nullWindow: true });
      expect(() => service.initialize()).not.toThrow();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('light');
      expect(rootElement.getAttribute(THEME_ATTRIBUTE)).toBe('system');
      expect(rootElement.getAttribute(RESOLVED_THEME_ATTRIBUTE)).toBe('light');
    });

    it('Missing/throwing matchMedia -> Safe system-light fallback', () => {
      const service = setupService({ matchMediaThrows: true });
      service.initialize();

      expect(service.preference()).toBe('system');
      expect(service.resolvedTheme()).toBe('light');
    });

    it('Constants check against contract values', () => {
      expect(DEFAULT_THEME_STORAGE_KEY).toBe('kui.theme-preference');
      expect(DARK_MODE_QUERY).toBe('(prefers-color-scheme: dark)');
      expect(THEME_ATTRIBUTE).toBe('data-theme');
      expect(RESOLVED_THEME_ATTRIBUTE).toBe('data-resolved-theme');
      expect(DEFAULT_THEME_COLOR_META_SELECTOR).toBe('meta[name="theme-color"]');
    });
  });
});
