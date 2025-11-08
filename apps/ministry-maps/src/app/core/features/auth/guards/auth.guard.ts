import { CanActivateFn, Router } from '@angular/router';

import { map } from 'rxjs';
import { UserStateService } from '../../../../state/user.state.service';
import { RoleEnum } from '../../../../../models/enums/role';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../../../../../models/user';

const canAccessRoute = (user: User, roles: string[]) => {
  return user?.role === RoleEnum.APP_ADMIN || roles.includes(user?.role);
};

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const userState = inject(UserStateService);
  const authService = inject(AuthService);

  const currentUser = userState.currentUser;
  const { roles } = route.data;
  if (!roles || roles?.includes('*')) {
    return true;
  }

  if (currentUser) {
    // User with Publisher role can't access to any other guarded route
    if (currentUser.role === RoleEnum.PUBLISHER && route.routeConfig?.path !== 'welcome') {
      return router.createUrlTree(['welcome']);
    }

    // Maybe we need to take those special routes treatment to a different place, app initializer maybe?
    // When the user was on the welcome page and a role was assigned to him, he will be redirected to the home page
    if (route.routeConfig?.path === 'welcome' && currentUser.role !== RoleEnum.PUBLISHER) {
      return router.createUrlTree(['home']);
    }

    return canAccessRoute(currentUser, roles);
  }

  return authService.resolveUserFromAuthProvider().pipe(
    map((user) => {
      // User hasn't authenticated yet to this application
      if (!user) {
        return router.createUrlTree(['login']);
      }

      if (user.role === RoleEnum.PUBLISHER) {
        return router.createUrlTree(['welcome']);
      }

      return canAccessRoute(user, roles);
    })
  );
};
