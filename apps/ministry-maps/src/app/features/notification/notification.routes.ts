import { Route } from '@angular/router';

import { NotificationRoutesEnum } from './models/enums/notification-routes';
import { NotificationCreatePageComponent } from './pages/notification-create-page/notification-create-page.component';
import { NotificationDetailsPageComponent } from './pages/notification-details-page/notification-details-page.component';
import { NotificationsPageComponent } from './pages/notifications-page/notifications-page.component';

export const NOTIFICATION_ROUTES: Route[] = [
  {
    path: NotificationRoutesEnum.LIST,
    component: NotificationsPageComponent,
  },
  {
    path: NotificationRoutesEnum.NEW,
    component: NotificationCreatePageComponent,
  },
  {
    path: ':notificationId',
    component: NotificationDetailsPageComponent,
  },
];
