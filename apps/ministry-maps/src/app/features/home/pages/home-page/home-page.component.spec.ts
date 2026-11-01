import { HomePageComponent } from './home-page.component';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { UserStateService } from '../../../../state/user.state.service';
import { RouterLink } from '@angular/router';
import { AuthorizeDirective, AuthUserStateService, CardHeaderComponent } from '@kingdom-apps/common-ui';
import { RoleEnum } from '../../../../../models/enums/role';

describe('HomePageComponent', () => {
  beforeEach(() =>
    MockBuilder(HomePageComponent)
      .keep(AuthorizeDirective)
      .provide({
        provide: AuthUserStateService,
        useFactory: () => {
          const state = new AuthUserStateService();
          state.setUser({ name: 'Carlos Almeida', roles: [RoleEnum.ADMIN] });
          return state;
        },
      }),
  );

  it('should create', () => {
    const fixture = MockRender(HomePageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should greet user', () => {
    const fixture = MockRender(HomePageComponent);
    const h2Welcome = fixture.debugElement.query(By.css('h2.t-headline2'));

    expect(h2Welcome.nativeElement.textContent).toEqual(`Bem-Vindo ${fixture.point.componentInstance.userName}!`);
  });

  it('should use user first name only', () => {
    const fixture = MockRender(HomePageComponent);
    const user = ngMocks.get(UserStateService);
    const userName = user.currentUser?.name.split(' ')[0];

    expect(fixture.point.componentInstance.userName).toEqual(userName);
  });

  it('links to the designations history page', () => {
    const fixture = MockRender(HomePageComponent);
    const historyLink = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .find((candidate) => candidate.nativeElement.textContent.includes('Histórico de Designações'));
    if (!historyLink) throw new Error('O link do histórico de designações não foi renderizado.');
    expect(ngMocks.input(historyLink, 'routerLink')).toBe('/territories/designations');
    expect(historyLink.nativeElement.textContent).toContain('Histórico de Designações');
  });

  it('links to territories and statistics pages', () => {
    const fixture = MockRender(HomePageComponent);
    const links = fixture.debugElement.queryAll(By.directive(RouterLink));

    const territoriesLink = links.find((c) => c.nativeElement.textContent.trim() === 'Territórios');
    const statisticsLink = links.find((c) => c.nativeElement.textContent.trim() === 'Estatísticas');

    if (!territoriesLink) throw new Error('Expected Territórios link to be rendered');
    expect(ngMocks.input(territoriesLink, 'routerLink')).toBe('/territories/');

    if (!statisticsLink) throw new Error('Expected Estatísticas link to be rendered');
    expect(ngMocks.input(statisticsLink, 'routerLink')).toBe('/territories/statistics');
  });

  it('renders the Congregação card with title, subtitle, icon, and consolidated links', () => {
    const fixture = MockRender(HomePageComponent);
    const card = ngMocks.find(fixture, '[data-testid="home-card-congregation"]');
    const header = ngMocks.find(card, CardHeaderComponent);

    expect(ngMocks.input(header, 'icon')).toBe('user-29');
    expect(ngMocks.input(header, 'title')).toBe('Congregação');
    expect(ngMocks.input(header, 'subtitle')).toBe('Administrar congregação e publicadores');

    const links = fixture.debugElement.queryAll(By.directive(RouterLink));
    const usersLink = links.find((candidate) => candidate.nativeElement.textContent.trim() === 'Pessoas');
    const congregationLink = links.find((candidate) =>
      candidate.nativeElement.textContent.trim() === 'Congregação',
    );

    if (!usersLink) throw new Error('Expected Pessoas link to be rendered');
    expect(ngMocks.input(usersLink, 'routerLink')).toBe('/congregation/users');

    if (!congregationLink) throw new Error('Expected Congregação link to be rendered');
    expect(ngMocks.input(congregationLink, 'routerLink')).toBe('/congregation');
  });

  const renderForRole = (role: RoleEnum) => {
    const authUserState = new AuthUserStateService();
    authUserState.setUser({ name: 'Test User', roles: [role] });

    const fixture = MockRender(
      HomePageComponent,
      {},
      {
        providers: [{ provide: AuthUserStateService, useValue: authUserState }],
      },
    );
    return fixture.debugElement.queryAll(By.directive(RouterLink));
  };

  it.each([RoleEnum.ORGANIZER, RoleEnum.ELDER, RoleEnum.SUPERINTENDENT])(
    'hides Congregação while keeping Pessoas visible for %s',
    (role) => {
      const links = renderForRole(role);
      const usersLink = links.find((candidate) => candidate.nativeElement.textContent.trim() === 'Pessoas');
      const congregationLink = links.find((candidate) =>
        candidate.nativeElement.textContent.trim() === 'Congregação',
      );

      expect(usersLink).toBeDefined();
      expect(congregationLink).toBeUndefined();
    },
  );

  it.each([RoleEnum.ADMIN, RoleEnum.APP_ADMIN])('shows Congregação for %s', (role) => {
    const links = renderForRole(role);
    const congregationLink = links.find((candidate) =>
      candidate.nativeElement.textContent.trim() === 'Congregação',
    );

    expect(congregationLink).toBeDefined();
  });
});
