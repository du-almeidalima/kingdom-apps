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
      // User with Publisher role can't access to any other guarded route
      if (currentUser.role === RoleEnum.PUBLISHER && route.routeConfig?.path !== 'welcome') {
        return this.router.createUrlTree(['welcome']);
      }

      // Maybe we need to take those special routes treatment to a different place, app initializer maybe?
      // When the user was on the welcome page and a role was assigned to him, he will be redirected to the home page
      if (route.routeConfig?.path === 'welcome' && currentUser.role !== RoleEnum.PUBLISHER) {
        return this.router.createUrlTree(['home']);
      }

      return currentUser?.role === RoleEnum.ADMIN || roles.includes(currentUser?.role);
    }

    return this.firebaseAuthDatasourceService.getUserFromAuthentication().pipe(
      map(user => {
        // User hasn't authenticated yet to this application
        if (!user) {
          return this.router.createUrlTree(['login']);
        }

        if (user.role === RoleEnum.PUBLISHER) {
          return this.router.createUrlTree(['welcome']);
        }

        return user?.role === RoleEnum.ADMIN || roles.includes(user?.role);
      }),
    );
  }
}
