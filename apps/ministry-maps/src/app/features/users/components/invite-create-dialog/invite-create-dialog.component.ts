import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { white100 } from '@kingdom-apps/common-ui';

import { RoleEnum } from '../../../../../models/enums/role';
import { InviteBO } from '../../bo/invite/invite-bo.service';
import { InviteCreateDialogCopyLinkComponent } from './invite-create-copy-link/invite-create-dialog-copy-link.component';
import { InviteCreateDialogFormComponent } from './invite-create-form/invite-create-dialog-form.component';
import { AuthRoutesEnum } from '../../../../core/features/auth/models/enums/auth-routes';
import { environment } from '../../../../../environments/environment';

export type TCreateLinkForm = FormGroup<{ role: FormControl<RoleEnum>; email: FormControl<string | null> }>;

@Component({
  selector: 'kingdom-apps-invite-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './invite-create-dialog.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InviteCreateDialogCopyLinkComponent,
    InviteCreateDialogFormComponent,
  ],
  template: `
    @if (createdLink()) {
    <kingdom-apps-invite-create-dialog-copy-link [inviteLink]="createdLink()" [title]="title()" />
    } @else {
    <kingdom-apps-invite-create-dialog-form
      [title]="title()"
      [form]="form"
      [isSubmitting]="isSubmitting()"
      (formSubmit)="handleFormSubmit()" />
    }
  `,
})
export class InviteCreateDialogComponent {
  protected readonly RoleEnum = RoleEnum;
  protected readonly white = white100;

  public form: TCreateLinkForm;

  isSubmitting = signal(false);
  createdLink = signal('');
  title = signal('Criar Link de Convite');

  constructor(private readonly inviteBO: InviteBO, formBuilder: FormBuilder) {
    this.form = formBuilder.group({
      role: formBuilder.control(RoleEnum.ORGANIZER, { nonNullable: true }),
      email: formBuilder.control<string>(''),
    });
  }

  handleFormSubmit() {
    this.isSubmitting.set(true);

    const values = this.form.getRawValue();

    this.inviteBO
      .createInviteLink(values)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe(invitationLink => {
        this.createdLink.set(this.composeInviteLink(invitationLink.id));
      });
  }

  private composeInviteLink(inviteLink: string) {
    return `${environment.baseUrl}${AuthRoutesEnum.SIGN_IN}/${inviteLink}`;
  }
}
