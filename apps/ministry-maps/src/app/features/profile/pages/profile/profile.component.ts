import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonComponentsModule, ConfirmDialogComponent, ConfirmDialogData } from '@kingdom-apps/common-ui';
import { UserStateService } from '../../../../state/user.state.service';
import { AuthService } from '../../../../core/features/auth/services/auth.service';
import { Dialog } from '@angular/cdk/dialog';
import { RoleEnum } from '../../../../../models/enums/role';

@Component({
  selector: 'kingdom-apps-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  standalone: true,
  imports: [CommonModule, CommonComponentsModule],
})
export class ProfileComponent implements OnInit {
  private readonly userStateService = inject(UserStateService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(Dialog);

  fullName = signal('Meu Nome');
  congregation = signal('LS Congregation');
  initials = computed(() => this.getInitials(this.fullName()));
  role = signal('Publicador');

  ngOnInit() {
    const user = this.userStateService.currentUser;

    if (user) {
      this.congregation.set(user.congregation?.name ?? 'LS Congregation');
      this.fullName.set(user.name);
      this.role.set(this.getRole(user.role))
    }
  }

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
