import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonComponentsModule, CommonDirectivesModule, CopyTextBlockComponent } from '@kingdom-apps/common-ui';
import { createSendWhatsAppLink } from '../../../../../shared/utils/share-utils';
import { isMobileDevice } from '../../../../../shared/utils/user-agent';

@Component({
  selector: 'kingdom-apps-invite-create-dialog-copy-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CommonComponentsModule, CommonDirectivesModule, CopyTextBlockComponent],
  styleUrl: `./invite-create-dialog-copy-link.component.scss`,
  template: `
    <lib-dialog [title]="title()">
      <h3 class="t-headline3 mb-5">Link de convite criado</h3>
      <p class="t-body2 mb-5">Compartilhe esse link com o irmão que vai acessar o aplicativo.</p>
      <!-- LINK CONTAINER -->
      <lib-copy-text-block [text]="inviteLink()"
                           helpText="Esse link só pode ser usado uma vez."
                           class="mb-9"
      />
      <!-- FOOTER -->
      <lib-dialog-footer>
        <div class="flex flex-nowrap justify-end gap-4">
          <button lib-button lib-dialog-close>Fechar</button>
          <button lib-button btnType="primary" type="button" (click)="handleSendInvitationLink()">
            <div class="flex flex-row gap-2">
              <lib-icon icon='paper-plane-2' class='h-7 w-7'></lib-icon>
              <span>Enviar</span>
            </div>
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class InviteCreateDialogCopyLinkComponent {
  title = input.required<string>();
  inviteLink = input.required<string>();

  handleSendInvitationLink() {
    const text = `Por favor, acesse o link abaixo e conecte com sua conta Google para acessar o MM.%0a%0a${this.inviteLink()}
    `;

    const builtUrl = createSendWhatsAppLink(text);

    if (isMobileDevice()) {
      window.location.href = builtUrl;
    } else {
      window.open(builtUrl);
    }
  }
}
