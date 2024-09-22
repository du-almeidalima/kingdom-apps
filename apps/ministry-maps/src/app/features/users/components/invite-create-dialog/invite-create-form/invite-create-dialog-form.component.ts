import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonComponentsModule, CommonDirectivesModule, white100 } from '@kingdom-apps/common-ui';
import { TCreateLinkForm } from '../invite-create-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RoleEnum } from '../../../../../../models/enums/role';
import { SharedModule } from '../../../../../shared/shared.module';

@Component({
  selector: 'kingdom-apps-invite-create-dialog-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, CommonComponentsModule, ReactiveFormsModule, CommonDirectivesModule, SharedModule],
  styles: `
    :host {
      display: block;
    }
  `,
  template: `
    <lib-dialog [title]="title()">
      <form id="invite-link-create-form" [formGroup]="form()" (ngSubmit)="formSubmit.emit()" tabindex="0">
        <!-- Email -->
        <lib-form-field class="mt-5">
          <label lib-label for="user-email">Email (opcional)</label>
          <input lib-input formControlName="email" type="email" id="user-email" />
          <span class="t-medium-emphasis"> Para criar um link que só possa ser usado com esse email. </span>
        </lib-form-field>
        <!-- ROLE -->
        <lib-form-field class="mt-5">
          <label lib-label for="user-name">Permissão</label>
          <kingdom-apps-icon-radio formControlName="role" [value]="RoleEnum.PUBLISHER" class="mt-3">
            <div class="radio-option">
              <span class="radio-option__title">Publicador</span>
              <span class="radio-option__description"
              >Permisão mais básica, apenas está associado a uma congregação.</span
              >
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
              Tem todas as permissões de um Organizador, mas também pode adicionar/remover territórios e ver pessoas da
              congregação.
            </span>
            </div>
          </kingdom-apps-icon-radio>
        </lib-form-field>
      </form>

      <!-- FOOTER -->
      <lib-dialog-footer>
        <div class="flex flex-nowrap justify-end gap-4">
          <button lib-button lib-dialog-close>Cancelar</button>
          <button lib-button btnType="primary" type="submit" form="invite-link-create-form">
            <span *ngIf="!isSubmitting()">Criar Link</span>
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
export class InviteCreateDialogFormComponent {
  protected readonly RoleEnum = RoleEnum;
  protected readonly white = white100;

  title = input.required<string>();
  form = input.required<TCreateLinkForm>();
  isSubmitting = input.required<boolean>();

  //TODO: Transform this to output() on new Angular version
  @Output() formSubmit = new EventEmitter<void>();
}
