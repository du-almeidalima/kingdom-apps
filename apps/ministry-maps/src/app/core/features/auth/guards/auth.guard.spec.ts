import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { MockProvider, ngMocks } from 'ng-mocks';
import { APP_ROUTES, FeatureRoutesEnum } from '../../../../app-routes';
import { CONGREGATION_ROUTES } from '../../../../features/congregation/congregation.routes';
import { CongregationRoutesEnum } from '../../../../features/congregation/models/enums/congregation-routes';
import { UserStateService } from '../../../../state/user.state.service';
import { organizerUserStateServiceMock, userMockBuilder } from '../../../../../test/mocks';
import { RoleEnum } from '../../../../../models/enums/role';
import { Observable, of } from 'rxjs';
import { AuthRoutesEnum } from '../models/enums/auth-routes';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RouterTestingModule,
        MockProvider(AuthService),
        MockProvider(UserStateService, organizerUserStateServiceMock),
      ],
    });
  });

  it('should allow access to route if required roles is "*"', () => {
    const route: ActivatedRouteSnapshot = { data: { roles: '*' } } as never;
    const state: RouterStateSnapshot = { url: `/${FeatureRoutesEnum.TERRITORIES}` } as never;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeTruthy();
  });

  it('should redirect authenticated Publishers users to Welcome Page', () => {
    const route: ActivatedRouteSnapshot = {
      data: { roles: 'ORGANIZER' },
      routeConfig: {
        path: FeatureRoutesEnum.TERRITORIES,
      },
    } as never;
    const state: RouterStateSnapshot = { url: `/${FeatureRoutesEnum.TERRITORIES}` } as never;
    const publisherUser = userMockBuilder({ role: RoleEnum.PUBLISHER });
    const userStateService = ngMocks.get(UserStateService);
    const router = ngMocks.get(Router);

    userStateService.setUser(publisherUser);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    const urlTree = router.createUrlTree(['welcome']);

    expect(result).toEqual(urlTree);
  });

  it('should redirect authenticated Non-Publishers users to Home Page', () => {
    const route: ActivatedRouteSnapshot = {
      data: { roles: 'ORGANIZER' },
      routeConfig: {
        path: AuthRoutesEnum.WELCOME,
      },
    } as never;
    const state: RouterStateSnapshot = { url: `/${FeatureRoutesEnum.TERRITORIES}` } as never;
    const publisherUser = userMockBuilder({ role: RoleEnum.ORGANIZER });
    const userStateService = ngMocks.get(UserStateService);
    const router = ngMocks.get(Router);

    userStateService.setUser(publisherUser);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    const urlTree = router.createUrlTree(['home']);

    expect(result).toEqual(urlTree);
  });

  it('should redirect unauthenticated users to login', (done) => {
    const route: ActivatedRouteSnapshot = {
      data: { roles: 'ORGANIZER' },
      routeConfig: {
        path: AuthRoutesEnum.WELCOME,
      },
    } as never;
    const state: RouterStateSnapshot = { url: `/${FeatureRoutesEnum.TERRITORIES}` } as never;
    const userStateService = ngMocks.get(UserStateService);
    const authService = ngMocks.get(AuthService);
    const router = ngMocks.get(Router);

    // Stub user unauthenticated
    userStateService.setUser(null);
    authService.resolveUserFromAuthProvider = jest.fn().mockReturnValue(of(undefined));

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    if (result instanceof Observable) {
      result.subscribe((value) => {
        const urlTree = router.createUrlTree(['login']);
        expect(value).toEqual(urlTree);
        done();
      });
      return;
    }

    // Should not have gotten in here
    expect(true).toBe(false);
  });

  it('should redirect Publishers users to login after authentication', (done) => {
    const route: ActivatedRouteSnapshot = {
      data: { roles: 'ORGANIZER' },
      routeConfig: {
        path: '',
      },
    } as never;
    const state: RouterStateSnapshot = { url: `` } as never;
    const userStateService = ngMocks.get(UserStateService);
    const authService = ngMocks.get(AuthService);
    const router = ngMocks.get(Router);

    // Stub user unauthenticated
    userStateService.setUser(null);
    authService.resolveUserFromAuthProvider = jest
      .fn()
      .mockReturnValue(of(userMockBuilder({ role: RoleEnum.PUBLISHER })));

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    if (result instanceof Observable) {
      result.subscribe((value) => {
        const urlTree = router.createUrlTree(['welcome']);
        expect(value).toEqual(urlTree);
        done();
      });
      return;
    }

    // Should not have gotten in here
    expect(true).toBe(false);
  });

  describe('should return true after authentication', () => {
    it.each([RoleEnum.ELDER, RoleEnum.ADMIN, RoleEnum.ORGANIZER, RoleEnum.SUPERINTENDENT, RoleEnum.APP_ADMIN])(
      'for %s',
      (role, done) => {
        const route: ActivatedRouteSnapshot = {
          data: { roles: [role] },
          routeConfig: {
            path: '',
          },
        } as never;
        const state: RouterStateSnapshot = { url: `` } as never;
        const userStateService = ngMocks.get(UserStateService);
        const authService = ngMocks.get(AuthService);

        // Stub user unauthenticated
        userStateService.setUser(null);
        authService.resolveUserFromAuthProvider = jest.fn().mockReturnValue(of(userMockBuilder({ role: role })));

        const result = TestBed.runInInjectionContext(() => authGuard(route, state));
        if (result instanceof Observable) {
          result.subscribe((value) => {
            expect(value).toBe(true);
            done();
          });

          return;
        }

        // Should not have gotten in here
        expect(true).toBe(false);
        done();
      },
    );
  });

  describe('Admins users', () => {
    it.each([
      FeatureRoutesEnum.TERRITORIES,
      FeatureRoutesEnum.HOME,
      FeatureRoutesEnum.WORK,
      FeatureRoutesEnum.PROFILE,
      FeatureRoutesEnum.CONGREGATION,
    ])(
      'should Access %s',
      (featureRoute) => {
        const route = APP_ROUTES.find((r) => r.path === featureRoute);

        if (!route) {
          throw new Error('Route Not Found');
        }

        const routeSnapshotMock: ActivatedRouteSnapshot = {
          data: route?.data,
          routeConfig: {
            path: featureRoute,
          },
        } as never;

        const state: RouterStateSnapshot = { url: `/${featureRoute}` } as never;
        const adminUser = userMockBuilder({ role: RoleEnum.ADMIN });
        const userStateService = ngMocks.get(UserStateService);

        userStateService.setUser(adminUser);

        const result = TestBed.runInInjectionContext(() => authGuard(routeSnapshotMock, state));

        expect(result).toBeTruthy();
      },
    );
  });

  describe('Congregation routes authorization', () => {
    const indexRoute = CONGREGATION_ROUTES.find((r) => r.path === CongregationRoutesEnum.INDEX);
    const usersRoute = CONGREGATION_ROUTES.find((r) => r.path === CongregationRoutesEnum.USERS);

    it.each([RoleEnum.ADMIN, RoleEnum.APP_ADMIN])('allows %s on /congregation', (role) => {
      const userStateService = ngMocks.get(UserStateService);
      userStateService.setUser(userMockBuilder({ role }));

      const routeSnapshot: ActivatedRouteSnapshot = {
        data: indexRoute?.data,
        routeConfig: { path: CongregationRoutesEnum.INDEX },
      } as never;
      const state: RouterStateSnapshot = { url: `/${FeatureRoutesEnum.CONGREGATION}` } as never;

      expect(TestBed.runInInjectionContext(() => authGuard(routeSnapshot, state))).toBe(true);
    });

    it.each([RoleEnum.ORGANIZER, RoleEnum.ELDER, RoleEnum.SUPERINTENDENT])('denies %s on /congregation', (role) => {
      const userStateService = ngMocks.get(UserStateService);
      userStateService.setUser(userMockBuilder({ role }));

      const routeSnapshot: ActivatedRouteSnapshot = {
        data: indexRoute?.data,
        routeConfig: { path: CongregationRoutesEnum.INDEX },
      } as never;
      const state: RouterStateSnapshot = { url: `/${FeatureRoutesEnum.CONGREGATION}` } as never;

      expect(TestBed.runInInjectionContext(() => authGuard(routeSnapshot, state))).toBe(false);
    });

    it.each([RoleEnum.ORGANIZER, RoleEnum.ELDER, RoleEnum.ADMIN, RoleEnum.SUPERINTENDENT, RoleEnum.APP_ADMIN])(
      'allows %s on /congregation/users',
      (role) => {
        const userStateService = ngMocks.get(UserStateService);
        userStateService.setUser(userMockBuilder({ role }));

        const routeSnapshot: ActivatedRouteSnapshot = {
          data: usersRoute?.data,
          routeConfig: { path: CongregationRoutesEnum.USERS },
        } as never;
        const state: RouterStateSnapshot = {
          url: `/${FeatureRoutesEnum.CONGREGATION}/${CongregationRoutesEnum.USERS}`,
        } as never;

        expect(TestBed.runInInjectionContext(() => authGuard(routeSnapshot, state))).toBe(true);
      },
    );
  });
});
