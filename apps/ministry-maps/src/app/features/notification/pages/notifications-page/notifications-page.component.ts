import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonComponent, SpinnerComponent, ToasterService } from '@kingdom-apps/common-ui';
import { catchError, of } from 'rxjs';

import { FeatureRoutesEnum } from '../../../../app-routes';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationListItemComponent } from '../../components/notification-list-item/notification-list-item.component';
import { NotificationStatusBadgeComponent } from '../../components/notification-status-badge/notification-status-badge.component';
import { NotificationRoutesEnum } from '../../models/enums/notification-routes';

@Component({
  selector: 'kingdom-apps-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    NotificationListItemComponent,
    NotificationStatusBadgeComponent,
    RouterLink,
    SpinnerComponent,
  ],
})
export class NotificationsPageComponent {
  private readonly bo = inject(NotificationBO);
  private readonly toaster = inject(ToasterService);

  protected readonly FeatureRoutes = FeatureRoutesEnum;
  protected readonly NotificationRoutes = NotificationRoutesEnum;

  protected readonly notifications = toSignal(
    this.bo.getAll().pipe(
      catchError(() => {
        this.toaster.error('Não foi possível carregar as notificações. Tente novamente.');
        return of([]);
      }),
    ),
    { initialValue: null },
  );
}
