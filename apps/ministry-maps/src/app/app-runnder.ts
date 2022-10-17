import { inject } from "@angular/core"
import { tap } from "rxjs"
import { FirebaseAuthDatasourceService } from "./core/features/auth/repositories/firebase/firebase-auth-datasource.service"
import { UserStateService } from "./state/user.state.service"

export const appRunner = () => {
  const firebaseAuthDatasourceService = inject(FirebaseAuthDatasourceService)
  const userState = inject(UserStateService)

  return () => {
    return firebaseAuthDatasourceService.getUserFromAuthentication()
      .pipe(
        tap((user => {
          if (user) {
            userState.setUser(user);
          }
        })
        )
      );
  }
}
