import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DEFAULT_TOAST_DURATION_MS, ToastConfig, ToastType } from './toaster.models';
import { IconComponent } from '../icon/icon.component';

type ToastItem = {
  id: number;
  durationMs: number;
  icon?: ToastConfig['icon'];
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
              <lib-icon [icon]="t.icon" fillColor="currentColor" />
            </div>
          }
          <span class="toast__message" data-testid="toast-message">{{ t.message }}</span>
        </div>
      }
    </div>
  `,
})
export class ToasterContainerComponent {
  private seq = 0;
  toasts = signal<ToastItem[]>([]);

  push(config: ToastConfig) {
    const type: ToastType = config.type ?? 'info';
    const durationMs = config.durationMs ?? DEFAULT_TOAST_DURATION_MS;

    const item: ToastItem = {
      id: ++this.seq,
      message: config.message,
      type,
      durationMs,
      icon: config.icon,
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
