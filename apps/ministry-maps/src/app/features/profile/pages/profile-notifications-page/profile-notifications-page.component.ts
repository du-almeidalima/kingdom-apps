import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonComponent, SpinnerComponent, ToasterService } from '@kingdom-apps/common-ui';
import { catchError, EMPTY, finalize } from 'rxjs';

import { UserNotification } from '../../../../../models/notification';
import { NotificationBO } from '../../../notification/bo/notification/notification.bo';
import { NotificationDialogComponent } from '../../../notification/components/notification-dialog/notification-dialog.component';
import { NotificationListItemComponent } from '../../../notification/components/notification-list-item/notification-list-item.component';
import { UserStateService } from '../../../../state/user.state.service';

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar o histórico de notificações.';

@Component({
  selector: 'kingdom-apps-profile-notifications-page',
  templateUrl: './profile-notifications-page.component.html',
  styleUrls: ['./profile-notifications-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NotificationListItemComponent, SpinnerComponent],
})
export class ProfileNotificationsPageComponent implements OnInit {
  private readonly bo = inject(NotificationBO);
  private readonly dialog = inject(Dialog);
  private readonly userState = inject(UserStateService);
  private readonly toaster = inject(ToasterService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userId = this.userState.currentUser?.id ?? '';

  protected readonly notifications = signal<UserNotification[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingAll = signal(false);

  ngOnInit(): void {
    this.bo
      .getHistory(this.userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.toaster.error(LOAD_ERROR_MESSAGE);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((page) => {
        this.notifications.set(page);
        this.hasMore.set(page.length === NotificationBO.HISTORY_PAGE_SIZE);
      });
  }

  protected handleLoadAll(): void {
    const lastShown = this.notifications().at(-1)?.acknowledgedAt;
    if (!lastShown) return;

    this.isLoadingAll.set(true);
    this.bo
      .getHistory(this.userId, lastShown)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.toaster.error(LOAD_ERROR_MESSAGE);
          return EMPTY;
        }),
        finalize(() => this.isLoadingAll.set(false)),
      )
      .subscribe((older) => {
        this.notifications.update((current) => [...current, ...older]);
        this.hasMore.set(false);
      });
  }

  protected handleOpen(notification: UserNotification): void {
    const { category, title, content } = notification;
    this.dialog.open(NotificationDialogComponent, { data: { category, title, content } });
  }
}
