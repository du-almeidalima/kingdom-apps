import { inject } from '@angular/core';
import { firstValueFrom, tap } from 'rxjs';
import { FirebaseAuthDatasourceService } from './repositories/firebase/firebase-auth-datasource.service';
import { UserStateService } from './state/user.state.service';
import { AuthUserStateService } from '@kingdom-apps/common-ui';

/** This runs when the application start to try to set the User in the State */
export const appLoginInitializer = () => {
  const firebaseAuthDatasourceService = inject(FirebaseAuthDatasourceService);
  const userState = inject(UserStateService);
  const authUserState = inject(AuthUserStateService);

  return firstValueFrom(
    firebaseAuthDatasourceService.getUserFromAuthentication().pipe(
      tap(user => {
        if (user) {
          userState.setUser(user);
          authUserState.setUser({ roles: [user.role], name: user.name });
        }
      })
    )
  );
};
