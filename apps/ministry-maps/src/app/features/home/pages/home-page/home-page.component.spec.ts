import { HomePageComponent } from './home-page.component';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { UserStateService } from '../../../../state/user.state.service';

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
});
