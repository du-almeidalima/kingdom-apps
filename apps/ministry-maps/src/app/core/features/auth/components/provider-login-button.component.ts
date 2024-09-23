import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { CommonComponentsModule } from '@kingdom-apps/common-ui';
import { FIREBASE_PROVIDERS } from '../repositories/firebase/firebase-auth-datasource.service';

@Component({
  selector: 'kingdom-apps-provider-login-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CommonComponentsModule, NgOptimizedImage],
  styleUrl: './provider-login-button.component.scss',
  template: `
    <!-- Button Container -->
    <div class="flex justify-between flex-col gap-5">
      <button
        class="provider-login-button"
        type="button"
        [style.--btn-size]="btnSize + 'px'"
        [disabled]="loading"
        (click)="providerClick.emit(provider)"
      >
        <!-- Button Content -->
        <img
          class="provider-login-button__logo"
          priority
          [height]="btnSize"
          [width]="btnSize"
          [ngSrc]="imgUrl"
          [alt]="imgAltText" />
        <span class="provider-login-button__text t-body2">Entrar com uma conta do {{ imgAltText }}</span>
        <lib-spinner *ngIf="loading"
                     class="provider-login-button__spinner"
                     height="2.5rem"
                     width="2.5rem"
        />
      </button>
    </div>
  `,
})
export class ProviderLoginButtonComponent {
  imgUrl: string;
  imgAltText: string;
  btnSize = 25;

  @Input()
  loading = false;

  @Input({ required: true })
  provider: FIREBASE_PROVIDERS = FIREBASE_PROVIDERS.GOOGLE;

  @Output()
  providerClick = new EventEmitter<FIREBASE_PROVIDERS>();

  constructor() {
    switch (this.provider) {
      case FIREBASE_PROVIDERS.GOOGLE:
        this.imgUrl =
          'https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA';
        this.imgAltText = 'Google';
        break;
      case FIREBASE_PROVIDERS.MICROSOFT:
        this.imgUrl =
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Microsoft_icon.svg/240px-Microsoft_icon.svg.png';
        this.imgAltText = 'Microsoft';
    }
  }
}
