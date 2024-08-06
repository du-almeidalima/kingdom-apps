import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonComponentsModule, CommonDirectivesModule, CopyTextBlockComponent } from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-invite-create-copy-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CommonComponentsModule, CommonDirectivesModule, CopyTextBlockComponent],
  styleUrl: `./invite-create-copy-link.component.scss`,
  template: `
    <h3 class="t-headline3">Link de convite criado!</h3>
    <!-- LINK CONTAINER -->
    <lib-copy-text-block [text]="inviteLink()"
                         helpText="Compartilhe esse link com o irmão que vai acessar o aplicativo." />
    <!-- FOOTER -->
    <lib-dialog-footer>
      <div class="flex flex-nowrap justify-end gap-4">
        <button lib-button lib-dialog-close>Fechar</button>
        <button lib-button btnType="primary" type="submit" form="invite-link-create-form">
          <div class="flex flex-row gap-2">
            <lib-icon icon='paper-plane-2' class='h-7 w-7'></lib-icon>
            <span>Enviar</span>
          </div>
        </button>
      </div>
    </lib-dialog-footer>
  `,
})
export class InviteCreateCopyLinkComponent {
  inviteLink = input.required<string>();
}
