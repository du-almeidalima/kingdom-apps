import { Dialog } from '@angular/cdk/dialog';
import { effect, inject, Injectable } from '@angular/core';
import { catchError, EMPTY, filter } from 'rxjs';

import { User } from '../../../../models/user';
import { UserStateService } from '../../../state/user.state.service';
import { NotificationBO } from '../bo/notification/notification.bo';
import {
  NotificationQueueComponent,
  NotificationQueueData,
} from '../components/notification-queue/notification-queue.component';

@Injectable({ providedIn: 'root' })
export class NotificationQueueService {
  private readonly bo = inject(NotificationBO);
  private readonly dialog = inject(Dialog);
  private readonly userState = inject(UserStateService);

  /**
   * The session user whose queue was already opened. Server refreshes re-emit the same user id;
   * a `null` user (logout) resets this so the next sign-in opens the queue again.
   */
  private lastOpenedUserId: string | null = null;

  constructor() {
    // Sign-in and the auth guard's session resolution both funnel through UserStateService,
    // so watching the authenticated transition keeps AuthService free of queue concerns.
    effect(() => {
      const user = this.userState.user();
      if (!user) {
        this.lastOpenedUserId = null;
        return;
      }
      if (user.id === this.lastOpenedUserId) {
        return;
      }

      this.lastOpenedUserId = user.id;
      this.openUnread(user);
    });
  }

  /** Opens the User's unread ACTIVE notifications in one non-dismissible queue; opens nothing when there are none. */
  openUnread(user: User): void {
    this.bo
      .getUnread(user)
      .pipe(
        filter((notifications) => notifications.length > 0),
        catchError(() => EMPTY),
      )
      .subscribe((notifications) => {
        const data: NotificationQueueData = { user, notifications };
        this.dialog.open(NotificationQueueComponent, { data, disableClose: true });
      });
  }
}
