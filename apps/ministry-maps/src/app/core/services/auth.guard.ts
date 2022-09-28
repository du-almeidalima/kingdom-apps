import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, UrlTree } from '@angular/router';

import { map, Observable } from 'rxjs';
import { UserStateService } from '../../state/user.state.service';
import { Role } from '../../../models/enums/role';
import { FirebaseAuthDatasourceService } from '../features/auth/repositories/firebase/firebase-auth-datasource.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userState: UserStateService,
    private readonly firebaseAuthDatasourceService: FirebaseAuthDatasourceService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const currentUser = this.userState.currentUser;
    const { roles } = route.data;

    if (currentUser) {
      return currentUser?.role === Role.ADMIN || roles.includes(currentUser?.role);
    }

    return this.firebaseAuthDatasourceService.getUserFromAuthentication().pipe(
      map(user => {
        return user?.role === Role.ADMIN || roles.includes(user?.role);
      })
    );
  }
}
