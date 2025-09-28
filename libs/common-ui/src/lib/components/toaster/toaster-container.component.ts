import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DEFAULT_TOAST_DURATION_MS, ToastConfig, ToastType } from './toaster.models';
import { IconComponent } from '../icon/icon.component';
import { green700, orange700, red700, text, white100 } from '../../styles/abstract/variables';

type ToastItem = {
  id: number;
  durationMs: number;
  icon?: ToastConfig['icon'];
  iconColor: string;
} & Required<Omit<ToastConfig, 'durationMs' | 'icon'>>;

@Component({
  selector: 'lib-toaster-container',
  styleUrls: ['./toaster-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="toaster" role="status">
      @for (t of toasts(); track t.id) {
        <div
          class="toast"
          [ngClass]="'toast--' + t.type"
          (click)="dismiss(t.id)"
          (keydown.enter)="dismiss(t.id)"
          (keydown.space)="dismiss(t.id)"
          tabindex="0"
          role="button"
          aria-label="Dismiss notification">
          @if (t.icon) {
            <div class="toast__icon">
              <lib-icon [icon]="t.icon" [fillColor]="t.iconColor" />
            </div>
          }
          <span class="toast__message">{{ t.message }}</span>
        </div>
      }
    </div>
  `,
})
export class ToasterContainerComponent {
  protected readonly text = text;

  private seq = 0;
  toasts = signal<ToastItem[]>([]);

  push(config: ToastConfig) {
    const type: ToastType = config.type ?? 'info';
    const durationMs = config.durationMs ?? DEFAULT_TOAST_DURATION_MS;

    const getIconColor = (toastType: ToastType): string => {
      switch (toastType) {
        case 'success': return green700;
        case 'warning': return orange700;
        case 'error': return red700;
        case 'info':
        default: return white100;
      }
    };

    const item: ToastItem = {
      id: ++this.seq,
      message: config.message,
      type,
      durationMs,
      icon: config.icon,
      iconColor: getIconColor(type)
    };

    this.toasts.update(list => [...list, item]);

    if (item.durationMs > 0) {
      window.setTimeout(() => this.dismiss(item.id), item.durationMs);
    }
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
