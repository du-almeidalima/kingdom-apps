import { ChangeDetectionStrategy, Component } from '@angular/core';

import { grey400, IconComponent } from '@kingdom-apps/common-ui';

/**
 * Full-screen state shown when a designation no longer exists (e.g. deleted by the
 * Firestore TTL retention policy). Follows the welcome screen layout.
 */
@Component({
  selector: 'kingdom-apps-designation-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="container not-found">
      <lib-icon
        icon="magnifier-lined"
        class="not-found__icon mb-8"
        [fillColor]="iconColor"
        data-testid="designation-not-found-icon"
      />
      <h2 class="t-headline1 mb-12" data-testid="designation-not-found-heading">Designação não encontrada</h2>
      <p class="t-body1 mb-5">
        Não foi possível encontrar esta designação. Ela pode ter expirado ou ter sido removida.
      </p>
      <p class="t-body1">
        Por favor, entre em contato com o Superintendente de Grupo (SG) da sua congregação para solicitar uma nova
        designação.
      </p>
    </div>
  `,
  styleUrls: ['./designation-not-found.component.scss'],
})
export class DesignationNotFoundComponent {
  protected readonly iconColor = 'currentColor';
}
