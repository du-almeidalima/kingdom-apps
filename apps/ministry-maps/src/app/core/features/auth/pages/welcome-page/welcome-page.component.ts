import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UserStateService } from '../../../../../state/user.state.service';
import { User } from '../../../../../../models/user';

@Component({
  selector: 'kingdom-apps-welcome-page',
  styleUrls: ['./welcome-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class='container'>
      <h2 class='t-headline1 mb-12'>Bem-Vindo {{ userName }}!</h2>
      <p class='t-body1 mb-5'>Sua conta foi criada com sucesso!</p>
      <p class='t-body1'>
        Sua conta está ligada a congregação {{user?.congregation?.name}}. Agora um dos administradores de sua congregação
        precisa te dar as permissões para você acessar as outras partes do aplicativo.
      </p>
    </div>
  `,
})
export class WelcomePageComponent {
  user: User | null;

  // TODO: Create a pipe for this
  get userName(): string {
    const userNames = this.user?.name.split(' ');
    return userNames ? userNames[0] : this.user?.name ?? '';
  }
  constructor(private userStateService: UserStateService) {
    this.user = this.userStateService.currentUser;
  }
}
