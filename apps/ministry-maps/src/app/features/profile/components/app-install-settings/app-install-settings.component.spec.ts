import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AppInstallSettingsComponent } from './app-install-settings.component';
import { PwaInstallService } from '../../../../core/services/pwa-install.service';

describe('AppInstallSettingsComponent', () => {
  let fixture: ComponentFixture<AppInstallSettingsComponent>;
  let component: AppInstallSettingsComponent;
  let isStandaloneSignal: ReturnType<typeof signal<boolean>>;
  let isInstalledOnDeviceSignal: ReturnType<typeof signal<boolean>>;
  let canPromptSignal: ReturnType<typeof signal<boolean>>;
  let isIosSignal: ReturnType<typeof signal<boolean>>;
  let isSamsungBrowserSignal: ReturnType<typeof signal<boolean>>;
  let promptInstallMock: jest.Mock;

  beforeEach(async () => {
    isStandaloneSignal = signal<boolean>(false);
    isInstalledOnDeviceSignal = signal<boolean>(false);
    canPromptSignal = signal<boolean>(false);
    isIosSignal = signal<boolean>(false);
    isSamsungBrowserSignal = signal<boolean>(false);
    promptInstallMock = jest.fn().mockResolvedValue('accepted');

    const mockPwaService = {
      isStandalone: isStandaloneSignal.asReadonly(),
      isInstalledOnDevice: isInstalledOnDeviceSignal.asReadonly(),
      canPrompt: canPromptSignal.asReadonly(),
      isIos: isIosSignal.asReadonly(),
      isSamsungBrowser: isSamsungBrowserSignal.asReadonly(),
      promptInstall: promptInstallMock,
    };

    await TestBed.configureTestingModule({
      imports: [AppInstallSettingsComponent],
      providers: [
        { provide: PwaInstallService, useValue: mockPwaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppInstallSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render installed state when isStandalone is true', () => {
    isStandaloneSignal.set(true);
    fixture.detectChanges();

    const installedState = fixture.debugElement.query(By.css('[data-testid="app-installed-state"]'));
    const installButton = fixture.debugElement.query(By.css('[data-testid="app-install-button"]'));

    expect(installedState).toBeTruthy();
    expect(installButton).toBeNull();
  });

  it('should render installed on device guidance when isInstalledOnDevice is true and not standalone', () => {
    isStandaloneSignal.set(false);
    isInstalledOnDeviceSignal.set(true);
    fixture.detectChanges();

    const openState = fixture.debugElement.query(By.css('[data-testid="app-open-state"]'));
    const installButton = fixture.debugElement.query(By.css('[data-testid="app-install-button"]'));

    expect(openState).toBeTruthy();
    expect(installButton).toBeNull();
  });

  it('should render install button when canPrompt is true and handle install click', async () => {
    isStandaloneSignal.set(false);
    isInstalledOnDeviceSignal.set(false);
    canPromptSignal.set(true);
    fixture.detectChanges();

    const installableState = fixture.debugElement.query(By.css('[data-testid="app-installable-state"]'));
    const installButton = fixture.debugElement.query(By.css('[data-testid="app-install-button"]'));

    expect(installableState).toBeTruthy();
    expect(installButton).toBeTruthy();

    await component.handleInstall();

    expect(promptInstallMock).toHaveBeenCalled();
  });

  it('should render Samsung Browser notice when isSamsungBrowser is true and promptable', () => {
    isStandaloneSignal.set(false);
    isInstalledOnDeviceSignal.set(false);
    canPromptSignal.set(true);
    isSamsungBrowserSignal.set(true);
    fixture.detectChanges();

    const samsungNotice = fixture.debugElement.query(By.css('[data-testid="samsung-browser-notice"]'));
    expect(samsungNotice).toBeTruthy();
  });

  it('should render iOS instructions when on iOS and cannot prompt', () => {
    isStandaloneSignal.set(false);
    isInstalledOnDeviceSignal.set(false);
    canPromptSignal.set(false);
    isIosSignal.set(true);
    fixture.detectChanges();

    const iosState = fixture.debugElement.query(By.css('[data-testid="app-ios-state"]'));
    expect(iosState).toBeTruthy();
  });

  it('should render manual browser guidance when not installed, cannot prompt, and not iOS', () => {
    isStandaloneSignal.set(false);
    isInstalledOnDeviceSignal.set(false);
    canPromptSignal.set(false);
    isIosSignal.set(false);
    fixture.detectChanges();

    const manualState = fixture.debugElement.query(By.css('[data-testid="app-manual-state"]'));
    expect(manualState).toBeTruthy();
  });
});
