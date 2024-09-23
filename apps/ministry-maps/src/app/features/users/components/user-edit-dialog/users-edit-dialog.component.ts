import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

import { CommonComponentsModule, CommonDirectivesModule, grey400, white100 } from '@kingdom-apps/common-ui';

import { SharedModule } from '../../../../shared/shared.module';
import { RoleEnum } from '../../../../../models/enums/role';
import { UserRepository } from '../../../../repositories/user.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { User } from '../../../../../models/user';
import { finalize } from 'rxjs';

export type UserEditDialogData = {
  user: User;
};

@Component({
  selector: 'kingdom-apps-users-edit-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './users-edit-dialog.component.scss',
  imports: [CommonModule, CommonComponentsModule, SharedModule, ReactiveFormsModule, CommonDirectivesModule],
  template: `
    <lib-dialog title="Editar Usuário">
      <form id="move-alert-resolution-form" [formGroup]="form" (ngSubmit)="handleFormSubmit()" tabindex="0">
        <!-- NAME -->
        <lib-form-field class="mt-5">
          <label lib-label for="user-name">Nome</label>
          <input lib-input formControlName="name" type="text" id="user-name" />
        </lib-form-field>
        <!-- ROLE -->
        <lib-form-field class="mt-5">
          <label lib-label for="user-name">Permissão</label>
          <kingdom-apps-icon-radio formControlName="role" [value]="RoleEnum.PUBLISHER" class="mt-3">
            <div class="radio-option">
              <span class="radio-option__title">Publicador</span>
              <span class="radio-option__description">Permisão mais básica, apenas está associado a uma congregação.</span>
            </div>
          </kingdom-apps-icon-radio>
          <kingdom-apps-icon-radio formControlName="role" [value]="RoleEnum.ORGANIZER" class="mt-3">
            <div class="radio-option">
              <span class="radio-option__title">Organizador</span>
              <span class="radio-option__description">
                Indicada para Publicadores qualificados ou Servos Ministeriais; Pode designar e atualizar territórios.
              </span>
            </div>
          </kingdom-apps-icon-radio>
          <kingdom-apps-icon-radio formControlName="role" [value]="RoleEnum.ELDER" class="mt-3">
            <div class="radio-option">
              <span class="radio-option__title">Ancião</span>
              <span class="radio-option__description">
                Tem todas as permissões de um Organizador, mas também pode adicionar/remover territórios e ver pessoas
                da congregação.
              </span>
            </div>
          </kingdom-apps-icon-radio>
          <kingdom-apps-icon-radio formControlName="role" [value]="RoleEnum.ADMIN" class="mt-3">
            <div class="radio-option">
              <span class="radio-option__title">Administrador</span>
              <span class="radio-option__description">
                Permissões geralmente dada ao SS. Tem acesso total aos mapas da congregação além de poder adicionar,
                excluir e alterar permissões de usuários.
              </span>
            </div>
          </kingdom-apps-icon-radio>
          @if (canEditAdminRoles) {
          <kingdom-apps-icon-radio formControlName="role" [value]="RoleEnum.SUPERINTENDENT" class="mt-3">
            <div class="radio-option">
              <span class="radio-option__title">Superintendente</span>
              <span class="radio-option__description">
                Tem as mesmas permissões de um Ancião, mas pode mudar de congregações.
              </span>
            </div>
          </kingdom-apps-icon-radio>
          }
        </lib-form-field>
      </form>

      <!-- FOOTER -->
      <lib-dialog-footer>
        <div class="flex flex-nowrap justify-end gap-4">
          <button lib-button lib-dialog-close>Cancelar</button>
          <button lib-button btnType="primary" type="submit" form="move-alert-resolution-form">
            <span *ngIf="!isSubmitting()">Salvar</span>
            <lib-spinner
              *ngIf="isSubmitting()"
              class="login-button__spinner"
              height="1.75rem"
              width="1.75rem"
              [color]="white" />
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class UsersEditDialogComponent {
  protected readonly RoleEnum = RoleEnum;
  protected readonly white = white100;
  protected readonly iconColor = grey400;

  public form: FormGroup<{
    role: FormControl<RoleEnum>;
    name: FormControl<string>;
  }>;

  isSubmitting = signal(false);
  canEditAdminRoles = false;

  constructor(
    @Inject(DIALOG_DATA) public readonly data: UserEditDialogData,
    private readonly dialogRef: DialogRef,
    private readonly userRepository: UserRepository,
    protected readonly userState: UserStateService,
    formBuilder: NonNullableFormBuilder
  ) {
    this.canEditAdminRoles = !!userState.currentUser?.role.includes(RoleEnum.APP_ADMIN);
    this.form = formBuilder.group({
      role: formBuilder.control(data.user.role),
      name: formBuilder.control(data.user.name),
    });

    if (
      (data.user.role === RoleEnum.SUPERINTENDENT || RoleEnum.ADMIN || RoleEnum.APP_ADMIN) &&
      userState.currentUser?.role !== RoleEnum.APP_ADMIN
    ) {
      this.form.disable();
    }
  }

  handleFormSubmit() {
    this.isSubmitting.set(true);
    const updatedUser = structuredClone(this.data.user);
    updatedUser.role = this.form.getRawValue().role;
    updatedUser.name = this.form.getRawValue().name;

    this.userRepository
      .update(updatedUser)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe(_ => {
        this.dialogRef.close();
      });
  }
}
