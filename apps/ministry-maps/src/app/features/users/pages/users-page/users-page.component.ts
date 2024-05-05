import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { User } from '../../../../../models/user';
import { UserStateService } from '../../../../state/user.state.service';
import { UserRepository } from '../../../../repositories/user.repository';
import { RoleEnum } from '../../../../../models/enums/role';
import { ConfirmDialogComponent, ConfirmDialogData } from '@kingdom-apps/common-ui';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'kingdom-apps-users-page',
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.scss'],
})
export class UsersPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly userRepository = inject(UserRepository);
  private readonly userState = inject(UserStateService);
  private readonly userPriorityMap = new Map<RoleEnum, number>([
    [RoleEnum.APP_ADMIN, 1],
    [RoleEnum.SUPERINTENDENT, 2],
    [RoleEnum.ADMIN, 3],
    [RoleEnum.ELDER, 4],
    [RoleEnum.ORGANIZER, 5],
    [RoleEnum.PUBLISHER, 6],
  ]);

  private readonly dialog = inject(Dialog);

  isLoading = false;
  users: User[] = [];


  ngOnInit(): void {
    if (this.userState.currentUser?.congregation?.id) {
      this.isLoading = true;
      this.userRepository.getAllByCongregation(this.userState.currentUser?.congregation?.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.isLoading = false;
          }),
        )
        .subscribe(users => {
          this.users = users.sort(this.sortUserFn.bind(this));
        });
    }
  }

  handleDeleteUser(userId: string): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
        data: { title: 'Você realmente deseja excluir este usuário?', bodyText: 'Essa ação não poderá ser desfeita' },
      })
      .closed.subscribe(res => {
      if (res) {
        this.userRepository.delete(userId);
      }
    });

  }

  handleEditUser(user: User) {
    console.log(user);
  }

  private sortUserFn(a: User, b: User) {
    return (this.userPriorityMap.get(a.role) ?? 99) - (this.userPriorityMap.get(b.role) ?? 99);
  }
}
