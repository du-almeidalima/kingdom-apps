import { inject } from '@angular/core';
import { tap } from 'rxjs';
import {
  FirebaseAuthDatasourceService,
} from './core/features/auth/repositories/firebase/firebase-auth-datasource.service';
import { UserStateService } from './state/user.state.service';
import { AuthUserStateService } from '@kingdom-apps/common-ui';

export const appRunner = () => {
  const firebaseAuthDatasourceService = inject(FirebaseAuthDatasourceService);
  const userState = inject(UserStateService);
  const authUserState = inject(AuthUserStateService);

  return () => {
    return firebaseAuthDatasourceService.getUserFromAuthentication()
      .pipe(
        tap((user => {
            if (user) {
              userState.setUser(user);
              authUserState.setUser({ roles: [user.role], name: user.name });
            }
          }),
        ),
      );
  };
};
