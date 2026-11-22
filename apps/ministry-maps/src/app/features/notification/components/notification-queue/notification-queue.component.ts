import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToasterService } from '@kingdom-apps/common-ui';
import { finalize } from 'rxjs';

import { Notification } from '../../../../../models/notification';
import { User } from '../../../../../models/user';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationDialogComponent } from '../notification-dialog/notification-dialog.component';

export type NotificationQueueData = { user: User; notifications: Notification[] };

@Component({
  selector: 'kingdom-apps-notification-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    'data-testid': 'notification-queue',
  },
  template: `
    <!-- Keyed by notification so every step gets a fresh dialog, resetting its reading gate and scroll. -->
    @for (notification of [current()]; track notification.id) {
      <kingdom-apps-notification-dialog
        [notification]="notification"
        [closable]="false"
        [scrollGate]="true"
        [actionLabel]="notification.actionLabel"
        [counter]="counter()"
        [submitting]="isSubmitting()"
        (actionClick)="handleAcknowledge(notification)"
      />
    }
  `,
  imports: [NotificationDialogComponent],
})
export class NotificationQueueComponent {
  protected readonly data = inject<NotificationQueueData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  private readonly bo = inject(NotificationBO);
  private readonly toaster = inject(ToasterService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly index = signal(0);
  protected readonly current = computed(() => this.data.notifications[this.index()]);
  protected readonly counter = computed(() =>
    this.data.notifications.length > 1 ? `${this.index() + 1} de ${this.data.notifications.length}` : undefined,
  );
  protected readonly isSubmitting = signal(false);

  protected handleAcknowledge(notification: Notification): void {
    this.isSubmitting.set(true);
    this.bo
      .acknowledge(notification, this.data.user)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => this.showNextOrClose(),
        error: () => this.toaster.error('Não foi possível registrar a confirmação. Tente novamente.'),
      });
  }

  private showNextOrClose(): void {
    if (this.index() + 1 < this.data.notifications.length) {
      this.index.update((index) => index + 1);
    } else {
      this.dialogRef.close();
    }
  }
}
