import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { CommonComponentsModule, CommonDirectivesModule, white100 } from '@kingdom-apps/common-ui';

import { SharedModule } from '../../../../shared/shared.module';
import { RoleEnum } from '../../../../../models/enums/role';
import { InviteBO } from '../../bo/invite/invite-bo.service';
import { InviteCreateCopyLinkComponent } from './invite-create-copy-link/invite-create-copy-link.component';
import { InviteCreateFormComponent } from './invite-create-form/invite-create-form.component';
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
    CommonComponentsModule,
    SharedModule,
    ReactiveFormsModule,
    CommonDirectivesModule,
    InviteCreateCopyLinkComponent,
    InviteCreateFormComponent,
  ],
  template: `
    <lib-dialog title="Criar Link de Convite">
      @if (true) {
      <kingdom-apps-invite-create-copy-link [inviteLink]="createdLink()"/>
      } @else {
      <kingdom-apps-invite-create-form [form]="form" [isSubmitting]="isSubmitting()" (formSubmit)="handleFormSubmit()"/>
      }
    </lib-dialog>
  `,
})
export class InviteCreateDialogComponent {
  protected readonly RoleEnum = RoleEnum;
  protected readonly white = white100;

  public form: TCreateLinkForm;

  isSubmitting = signal(false);
  createdLink = signal('');

  constructor(private readonly inviteBO: InviteBO, formBuilder: FormBuilder) {
    this.form = formBuilder.group({
      role: formBuilder.control(RoleEnum.ORGANIZER, { nonNullable: true }),
      email: formBuilder.control<string>(''),
    });

    this.createdLink.set(this.composeInviteLink('1234-4321-4312'))
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
        this.createdLink.set(invitationLink.id);
      });
  }

  private composeInviteLink(inviteLink: string) {
    return `${environment.baseUrl}${AuthRoutesEnum.SIGN_IN}/${inviteLink}`
  }
}
