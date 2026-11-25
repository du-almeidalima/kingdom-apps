import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  ButtonComponent,
  DialogFooterComponent,
  IconComponent,
  MarkdownComponent,
  ResponsiveDialogComponent,
} from '@kingdom-apps/common-ui';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { NotificationContent } from '../../../../../models/notification';
import { NOTIFICATION_CATEGORY_PRESETS } from '../../config/notification-category.config';

@Component({
  selector: 'kingdom-apps-notification-dialog',
  styleUrls: ['./notification-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-responsive-dialog [closable]="closable()" data-testid="notification-dialog">
      <div
        dialogHeader
        class="notification-header"
        [class.notification-header--warning]="notification().category === NotificationCategory.WARNING"
      >
        <div class="notification-header__badge" aria-hidden="true">
          <lib-icon class="notification-header__icon" [icon]="presets[notification().category].icon" />
        </div>
        <div class="notification-header__text">
          <p class="notification-header__category t-caption" data-testid="notification-dialog-category">
            {{ presets[notification().category].label }}
          </p>
          <h2 class="notification-header__title t-headline4" data-testid="notification-dialog-title">
            {{ notification().title }}
          </h2>
        </div>
      </div>
      <lib-markdown [content]="notification().content" />
      @if (scrollGate()) {
        <div #sentinel class="notification-dialog__sentinel" data-testid="notification-dialog-sentinel"></div>
      }
      <lib-dialog-footer>
        <div class="notification-dialog__footer">
          @if (counter(); as counterText) {
            <span class="t-body2 t-medium-emphasis" data-testid="notification-dialog-counter">
              {{ counterText }}
            </span>
          }
          <button
            lib-button
            btnType="primary"
            class="notification-dialog__action"
            data-testid="notification-dialog-action"
            [disabled]="!reachedBottom() || submitting()"
            (click)="handleActionClick()"
          >
            {{ reachedBottom() ? actionLabel() : 'Role até o fim para continuar' }}
          </button>
        </div>
      </lib-dialog-footer>
    </lib-responsive-dialog>
  `,
  imports: [ButtonComponent, DialogFooterComponent, IconComponent, MarkdownComponent, ResponsiveDialogComponent],
})
export class NotificationDialogComponent {
  private readonly dialogRef = inject(DialogRef, { optional: true });

  notification = input<NotificationContent>(inject<NotificationContent>(DIALOG_DATA));
  closable = input(true);
  scrollGate = input(false);
  actionLabel = input('Fechar');
  counter = input<string>();
  submitting = input(false);
  actionClick = output<void>();

  protected readonly NotificationCategory = NotificationCategoryEnum;
  protected readonly presets = NOTIFICATION_CATEGORY_PRESETS;

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private readonly reachedBottomState = signal(false);
  protected readonly reachedBottom = computed(() => !this.scrollGate() || this.reachedBottomState());

  constructor() {
    effect((onCleanup) => {
      const sentinelEl = this.sentinel()?.nativeElement;
      this.reachedBottomState.set(false);
      if (!this.scrollGate() || !sentinelEl) {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.reachedBottomState.set(true);
          }
        },
        { root: sentinelEl.parentElement },
      );
      observer.observe(sentinelEl);
      onCleanup(() => observer.disconnect());
    });
  }

  protected handleActionClick(): void {
    this.actionClick.emit();
    if (!this.scrollGate()) {
      this.dialogRef?.close();
    }
  }
}
