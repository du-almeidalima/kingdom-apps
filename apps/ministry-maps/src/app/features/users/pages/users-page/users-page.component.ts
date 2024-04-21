import { Component, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { User } from '../../../../../models/user';
import { UserStateService } from '../../../../state/user.state.service';
import { UserRepository } from '../../../../repositories/user.repository';
import { RoleEnum } from '../../../../../models/enums/role';

@Component({
  selector: 'kingdom-apps-users-page',
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.scss'],
})
export class UsersPageComponent implements OnInit {
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

  isLoading = false;
  users: User[] = [];

  ngOnInit(): void {
    if (this.userState.currentUser?.congregation?.id) {
      this.isLoading = true;
      this.userRepository.getAllByCongregation(this.userState.currentUser?.congregation?.id)
        .pipe(
          finalize(() => {
            this.isLoading = false;
          }),
        )
        .subscribe(users => {
          this.users = users.sort(this.sortUserFn.bind(this));
        });
    }
  }

  private sortUserFn(a: User, b: User) {
    return (this.userPriorityMap.get(a.role) ?? 99) - (this.userPriorityMap.get(b.role) ?? 99);
  }
}
