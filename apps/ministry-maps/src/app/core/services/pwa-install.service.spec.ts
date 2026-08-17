import { TestBed } from '@angular/core/testing';
import { BeforeInstallPromptEvent, PwaInstallService } from './pwa-install.service';

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    localStorage.clear();
    delete window.__deferredPwaPrompt;
    TestBed.configureTestingModule({
      providers: [PwaInstallService],
    });
    service = TestBed.inject(PwaInstallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle beforeinstallprompt event and enable canPrompt', () => {
    const mockPromptEvent = {
      preventDefault: jest.fn(),
      prompt: jest.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEvent;

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
    );

    expect(service.canPrompt()).toBe(true);
  });

  it('should prompt installation and handle accepted choice', async () => {
    const mockPromptEvent = {
      preventDefault: jest.fn(),
      prompt: jest.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEvent;

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
    );

    const outcome = await service.promptInstall();

    expect(outcome).toBe('accepted');
    expect(service.isInstalledOnDevice()).toBe(true);
    expect(service.canPrompt()).toBe(false);
  });

  it('should return unavailable when no prompt event exists', async () => {
    const outcome = await service.promptInstall();
    expect(outcome).toBe('unavailable');
  });

  it('should handle appinstalled event', () => {
    window.dispatchEvent(new Event('appinstalled'));
    expect(service.isInstalledOnDevice()).toBe(true);
    expect(service.canPrompt()).toBe(false);
  });
});
