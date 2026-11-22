import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ButtonComponent,
  FormFieldComponent,
  InputComponent,
  LabelComponent,
  MultiSelectChipsComponent,
  MultiSelectOption,
  SelectComponent,
  SpinnerComponent,
  ToasterService,
} from '@kingdom-apps/common-ui';
import { finalize } from 'rxjs';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { getTranslatedRole, RoleEnum } from '../../../../../models/enums/role';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationDialogComponent } from '../../components/notification-dialog/notification-dialog.component';
import { NOTIFICATION_CATEGORY_PRESETS } from '../../config/notification-category.config';

const DEFAULT_ACTION_LABEL = 'Entendi';
const NON_BLANK = [Validators.required, Validators.pattern(/\S/)];

@Component({
  selector: 'kingdom-apps-notification-create-page',
  templateUrl: './notification-create-page.component.html',
  styleUrls: ['./notification-create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    LabelComponent,
    MultiSelectChipsComponent,
    ReactiveFormsModule,
    SelectComponent,
    SpinnerComponent,
  ],
})
export class NotificationCreatePageComponent {
  private readonly bo = inject(NotificationBO);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toaster = inject(ToasterService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = Object.values(NotificationCategoryEnum);
  protected readonly presets = NOTIFICATION_CATEGORY_PRESETS;
  protected readonly isSubmitting = signal(false);
  protected readonly roleOptions: MultiSelectOption<RoleEnum>[] = Object.values(RoleEnum).map((role) => ({
    value: role,
    label: getTranslatedRole(role),
  }));
  protected readonly form = new FormGroup({
    category: new FormControl(NotificationCategoryEnum.INFO, { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: NON_BLANK }),
    content: new FormControl('', { nonNullable: true, validators: NON_BLANK }),
    actionLabel: new FormControl(DEFAULT_ACTION_LABEL, { nonNullable: true, validators: NON_BLANK }),
    targetRoles: new FormControl<RoleEnum[]>([], { nonNullable: true }),
  });

  protected handlePreview(): void {
    const { category, title, content } = this.form.getRawValue();
    this.dialog.open(NotificationDialogComponent, { data: { category, title, content } });
  }

  protected handlePublish(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    const { category, title, content, actionLabel, targetRoles } = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.bo
      .publish({ category, title, content, actionLabel, targetRoles })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.toaster.success('Notificação publicada.');
          this.router.navigate(['/', FeatureRoutesEnum.NOTIFICATIONS]);
        },
        error: () => this.toaster.error('Não foi possível publicar a notificação. Tente novamente.'),
      });
  }
}
