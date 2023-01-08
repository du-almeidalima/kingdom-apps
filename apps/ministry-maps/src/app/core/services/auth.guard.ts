import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';

import { map, Observable } from 'rxjs';
import { UserStateService } from '../../state/user.state.service';
import { RoleEnum } from '../../../models/enums/role';
import { FirebaseAuthDatasourceService } from '../features/auth/repositories/firebase/firebase-auth-datasource.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userState: UserStateService,
    private readonly firebaseAuthDatasourceService: FirebaseAuthDatasourceService,
    private readonly router: Router,
  ) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const currentUser = this.userState.currentUser;
    const { roles } = route.data;

    if (currentUser) {
      return currentUser?.role === RoleEnum.ADMIN || roles.includes(currentUser?.role);
    }

    return this.firebaseAuthDatasourceService.getUserFromAuthentication().pipe(
      map(user => {
        // User hasn't authenticated yet to this application
        if (!currentUser) {
          return this.router.createUrlTree(['/login'])
        }

        return user?.role === RoleEnum.ADMIN || roles.includes(user?.role);
      }),
    );
  }
}
