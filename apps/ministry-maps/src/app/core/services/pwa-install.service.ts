import { computed, Injectable, signal } from '@angular/core';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent;
  }
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private static readonly PWA_INSTALLED_STORAGE_KEY = 'mm_pwa_installed';

  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  readonly isStandalone = signal<boolean>(false);
  readonly isInstalledOnDevice = signal<boolean>(false);
  readonly isIos = signal<boolean>(false);

  readonly canPrompt = computed(() => !this.isStandalone() && !this.isInstalledOnDevice() && !!this.deferredPrompt());

  constructor() {
    this.init();
  }

  init(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Check standalone mode (running as installed PWA window)
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'));
    this.isStandalone.set(isStandalone);

    // Check if installed on device (from storage or standalone)
    try {
      const storedInstalled = localStorage.getItem(PwaInstallService.PWA_INSTALLED_STORAGE_KEY);
      if (storedInstalled === 'true' || isStandalone) {
        this.isInstalledOnDevice.set(true);
      }
    } catch {
      // localStorage may be inaccessible in certain security contexts
    }

    this.checkInstalledRelatedApps();

    // Listen to display-mode changes
    try {
      const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
      mediaQuery?.addEventListener?.('change', (e: MediaQueryListEvent) => {
        this.isStandalone.set(e.matches);
        if (e.matches) {
          this.markAsInstalledOnDevice();
        }
      });
    } catch {
      // matchMedia listener not supported in this environment
    }

    // Check iOS
    const ua = window.navigator?.userAgent ?? '';
    const isIos = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    this.isIos.set(isIos);

    // Pick up early prompt if already captured on window
    if (window.__deferredPwaPrompt) {
      this.deferredPrompt.set(window.__deferredPwaPrompt);
    }

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      this.deferredPrompt.set(promptEvent);
    });

    // Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      this.markAsInstalledOnDevice();
      this.deferredPrompt.set(null);
      if (typeof window !== 'undefined') {
        window.__deferredPwaPrompt = undefined;
      }
    });
  }

  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const prompt = this.deferredPrompt();
    if (!prompt) {
      return 'unavailable';
    }

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.markAsInstalledOnDevice();
        this.deferredPrompt.set(null);
        if (typeof window !== 'undefined') {
          window.__deferredPwaPrompt = undefined;
        }
      }
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }

  private markAsInstalledOnDevice(): void {
    this.isInstalledOnDevice.set(true);
    try {
      localStorage.setItem(PwaInstallService.PWA_INSTALLED_STORAGE_KEY, 'true');
    } catch {
      // localStorage may be inaccessible in private browsing mode
    }
  }

  private async checkInstalledRelatedApps(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await (
          navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> }
        ).getInstalledRelatedApps();
        if (Array.isArray(relatedApps) && relatedApps.length > 0) {
          this.markAsInstalledOnDevice();
        }
      } catch {
        // getInstalledRelatedApps not supported or rejected
      }
    }
  }
}
