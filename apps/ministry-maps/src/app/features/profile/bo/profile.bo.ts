import { inject, Injectable } from '@angular/core';
import { UserRepository } from '../../../repositories/user.repository';
import { Observable, of, switchMap, tap } from 'rxjs';
import { User } from '../../../../models/user';
import { RoleEnum } from '../../../../models/enums/role';
import { UserStateService } from '../../../state/user.state.service';

@Injectable({ providedIn: 'root' })
export class ProfileBO {
  private userRepository = inject(UserRepository);
  private userState = inject(UserStateService);

  /** Validates if the provided user is an ADMIN and updates its congregation id */
  public changeUserCongregation(userId: string, congregationId: string): Observable<User | null> {
    return this.userRepository.getById(userId)
      .pipe(
        switchMap(user => {
          if (!user || !user.congregation) {
            return of(null);
          }

          if (user.role !== RoleEnum.ADMIN) {
            throw Error('Changing congregations is not authorized by Non-Admin users.');
          }

          user.congregation.id = congregationId;

          return this.userRepository.update(user)
            .pipe(
              tap(updatedUser => {
                  if (!updatedUser) return;

                  // Notifying application that the user was updated
                  this.userState.setUser(updatedUser);
                },
              ),
            );
        }),
      );
  }
}
