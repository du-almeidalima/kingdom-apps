import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CommonComponentsModule,
  CommonDirectivesModule,
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@kingdom-apps/common-ui';
import { UserStateService } from '../../../../state/user.state.service';
import { AuthService } from '../../../../core/features/auth/services/auth.service';
import { Dialog } from '@angular/cdk/dialog';
import { RoleEnum } from '../../../../../models/enums/role';
import { ChangeCongregationComponent } from '../../components/change-congregation.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'kingdom-apps-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  standalone: true,
  imports: [CommonModule, CommonComponentsModule, ChangeCongregationComponent, CommonDirectivesModule],
})
export class ProfileComponent {
  private readonly userStateService = inject(UserStateService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(Dialog);

  user = toSignal(this.userStateService.$user);
  fullName = computed(() => this.user()?.name ?? 'Meu Nome');
  congregation = computed(() => this.user()?.congregation?.name ?? 'LS Congregação');
  initials = computed(() => this.getInitials(this.fullName()));
  role = computed(() => this.getRole(this.user()?.role ?? RoleEnum.PUBLISHER));

  handleLogOut() {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
        data: { title: 'Sair', bodyText: 'Você realmente deseja sair?' },
      })
      .closed.subscribe(res => {
        if (res) {
          this.authService.logOut();
        }
      });
  }

  private getInitials(name: string | undefined) {
    if (!name) return 'XX';

    const splitWords = name.split(' ');
    return splitWords.length > 1 ? splitWords[0][0] + splitWords[1][0] : splitWords[0].substring(0, 2);
  }

  private getRole(role: RoleEnum) {
    switch (role) {
      case RoleEnum.ORGANIZER:
        return 'Organizador';
      case RoleEnum.ADMIN:
        return 'Admin';
      case RoleEnum.ELDER:
        return 'Ancião';
      case RoleEnum.PUBLISHER:
      default:
        return 'Publicador';
    }
  }
}
