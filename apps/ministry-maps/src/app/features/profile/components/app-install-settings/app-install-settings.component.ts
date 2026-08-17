import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonComponent, IconComponent } from '@kingdom-apps/common-ui';
import { SectionComponent } from '../../../../shared/components/section/section.component';
import { PwaInstallService } from '../../../../core/services/pwa-install.service';

export enum AppInstallStatus {
  STANDALONE = 'STANDALONE',
  OPEN_APP = 'OPEN_APP',
  PROMPT = 'PROMPT',
  IOS = 'IOS',
  MANUAL = 'MANUAL',
}

@Component({
  selector: 'kingdom-apps-app-install-settings',
  standalone: true,
  imports: [SectionComponent, ButtonComponent, IconComponent],
  templateUrl: './app-install-settings.component.html',
  styleUrls: ['./app-install-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppInstallSettingsComponent {
  protected readonly AppInstallStatus = AppInstallStatus;

  private readonly pwaInstallService = inject(PwaInstallService);

  readonly isInstalling = signal(false);
  readonly isSamsungBrowser = computed(() => this.pwaInstallService.isSamsungBrowser());

  readonly status = computed<AppInstallStatus>(() => {
    if (this.pwaInstallService.isStandalone()) {
      return AppInstallStatus.STANDALONE;
    }
    if (this.pwaInstallService.isInstalledOnDevice()) {
      return AppInstallStatus.OPEN_APP;
    }
    if (this.pwaInstallService.canPrompt()) {
      return AppInstallStatus.PROMPT;
    }
    if (this.pwaInstallService.isIos()) {
      return AppInstallStatus.IOS;
    }
    return AppInstallStatus.MANUAL;
  });

  async handleInstall(): Promise<void> {
    this.isInstalling.set(true);
    try {
      await this.pwaInstallService.promptInstall();
    } finally {
      this.isInstalling.set(false);
    }
  }
}
