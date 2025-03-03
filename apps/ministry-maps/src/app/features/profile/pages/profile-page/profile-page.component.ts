import { Component, computed, inject } from '@angular/core';
import {
  AuthorizeDirective,
  ButtonComponent,
  CardComponent,
  ConfirmDialogComponent,
  ConfirmDialogData,
  IconComponent,
} from '@kingdom-apps/common-ui';
import { toSignal } from '@angular/core/rxjs-interop';
import { Dialog } from '@angular/cdk/dialog';

import { UserStateService } from '../../../../state/user.state.service';
import { AuthService } from '../../../../core/features/auth/services/auth.service';
import { getTranslatedRole, RoleEnum } from '../../../../../models/enums/role';
import { ChangeCongregationComponent } from '../../components/change-congregation.component';
import { getUserInitials } from '../../../../shared/utils/user-utils';
import { ProfileBO } from '../../bo/profile.bo';

@Component({
  selector: 'kingdom-apps-profile',
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  standalone: true,
  imports: [ChangeCongregationComponent, CardComponent, ButtonComponent, IconComponent, AuthorizeDirective],
})
export class ProfilePageComponent {
  protected readonly RoleEnum = RoleEnum;
  protected readonly CHANGE_CONGREGATION_ALLOWED = ProfileBO.CHANGE_CONGREGATION_ALLOWED;

  private readonly userStateService = inject(UserStateService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(Dialog);

  user = toSignal(this.userStateService.$user);
  fullName = computed(() => this.user()?.name ?? 'Meu Nome');
  congregation = computed(() => this.user()?.congregation?.name ?? 'LS Congregação');
  initials = computed(() => getUserInitials(this.fullName()));
  role = computed(() => getTranslatedRole(this.user()?.role ?? RoleEnum.PUBLISHER));

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
}
