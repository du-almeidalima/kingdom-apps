import { HomePageComponent } from './home-page.component';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { UserStateService } from '../../../../state/user.state.service';
import { RouterLink } from '@angular/router';

describe('HomePageComponent', () => {
  beforeEach(() => MockBuilder(HomePageComponent));

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
    const historyLink = fixture.debugElement.queryAll(By.directive(RouterLink)).find((candidate) => candidate.nativeElement.textContent.includes('Histórico de Designações'));
    if (!historyLink) throw new Error('O link do histórico de designações não foi renderizado.');
    expect(ngMocks.input(historyLink, 'routerLink')).toBe('/territories/designations');
    expect(historyLink.nativeElement.textContent).toContain('Histórico de Designações');
  });
});
