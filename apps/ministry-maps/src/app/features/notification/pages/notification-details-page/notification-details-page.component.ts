import { Dialog } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  ConfirmDialogData,
  ExpansionPanelComponent,
  SpinnerComponent,
  ToasterService,
} from '@kingdom-apps/common-ui';
import { catchError, filter, map, of, switchMap } from 'rxjs';

import { NotificationStatusEnum } from '../../../../../models/enums/notification-status';
import { getTranslatedRole } from '../../../../../models/enums/role';
import { Notification, NotificationAcknowledgmentEntry } from '../../../../../models/notification';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationStatusBadgeComponent } from '../../components/notification-status-badge/notification-status-badge.component';
import { NotificationDialogComponent } from '../../components/notification-dialog/notification-dialog.component';
import { NOTIFICATION_CATEGORY_PRESETS } from '../../config/notification-category.config';

type NotificationState = { loaded: boolean; notification?: Notification };
type CongregationAcknowledgments = {
  key: string;
  name: string;
  entries: NotificationAcknowledgmentEntry[];
};

const INITIAL_STATE: NotificationState = { loaded: false, notification: undefined };

@Component({
  selector: 'kingdom-apps-notification-details-page',
  templateUrl: './notification-details-page.component.html',
  styleUrls: ['./notification-details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, DatePipe, ExpansionPanelComponent, NotificationStatusBadgeComponent, SpinnerComponent],
})
export class NotificationDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bo = inject(NotificationBO);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toaster = inject(ToasterService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationId = this.route.snapshot.paramMap.get('notificationId') ?? '';

  protected readonly presets = NOTIFICATION_CATEGORY_PRESETS;
  protected readonly NotificationStatus = NotificationStatusEnum;
  protected readonly roleLabel = getTranslatedRole;

  protected readonly state = toSignal(
    this.bo.getById(this.notificationId).pipe(
      map((notification): NotificationState => ({ loaded: true, notification })),
      catchError(() => {
        this.toaster.error('Não foi possível carregar a notificação.');
        return of<NotificationState>({ loaded: true, notification: undefined });
      }),
    ),
    { initialValue: INITIAL_STATE },
  );

  protected readonly acknowledgments = toSignal(
    this.bo.getAcknowledgments(this.notificationId).pipe(
      catchError(() => {
        this.toaster.error('Não foi possível carregar as confirmações.');
        return of([]);
      }),
    ),
    { initialValue: null },
  );

  protected readonly acknowledgmentGroups = computed<CongregationAcknowledgments[]>(() => {
    const groups = new Map<string, NotificationAcknowledgmentEntry[]>();
    for (const entry of this.acknowledgments() ?? []) {
      const entries = groups.get(entry.congregationName);
      if (entries) {
        entries.push(entry);
      } else {
        groups.set(entry.congregationName, [entry]);
      }
    }

    return Array.from(groups, ([key, entries]) => ({ key, name: key || 'Sem congregação', entries }));
  });

  protected readonly expandedCongregations = signal<ReadonlySet<string>>(new Set());

  protected handleToggleCongregation(key: string, expanded: boolean): void {
    this.expandedCongregations.update((current) => {
      const next = new Set(current);
      if (expanded) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  protected handlePreview(notification: Notification): void {
    const { category, title, content } = notification;
    this.dialog.open(NotificationDialogComponent, { data: { category, title, content } });
  }

  protected handleToggleStatus(notification: Notification): void {
    this.bo
      .toggleStatus(notification)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.toaster.error('Não foi possível alterar o status da notificação.'),
      });
  }

  protected handleDelete(notification: Notification): void {
    this.dialog
      .open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
        data: {
          title: 'Excluir Notificação',
          bodyText: `
          <p>Você realmente deseja excluir esta notificação?</p>
          <p class='mt-5'>As confirmações registradas também serão apagadas. Essa ação não poderá ser desfeita.</p>
          `,
        },
      })
      .closed.pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.bo.delete(notification.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toaster.success('Notificação excluída.');
          this.router.navigate(['/', FeatureRoutesEnum.NOTIFICATIONS]);
        },
        error: () => this.toaster.error('Não foi possível excluir a notificação. Tente novamente.'),
      });
  }
}
