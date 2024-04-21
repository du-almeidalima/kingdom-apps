import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CommonComponentsModule,
  CommonDirectivesModule,
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@kingdom-apps/common-ui';
import { toSignal } from '@angular/core/rxjs-interop';
import { Dialog } from '@angular/cdk/dialog';

import { UserStateService } from '../../../../state/user.state.service';
import { AuthService } from '../../../../core/features/auth/services/auth.service';
import { getTranslatedRole, RoleEnum } from '../../../../../models/enums/role';
import { ChangeCongregationComponent } from '../../components/change-congregation.component';
import { getUserInitials } from '../../../../shared/utils/user-utils';

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
