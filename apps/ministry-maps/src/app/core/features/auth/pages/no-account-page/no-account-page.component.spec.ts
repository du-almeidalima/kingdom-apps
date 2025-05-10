import { NoAccountPageComponent } from './no-account-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';

describe('NoAccountPageComponent', () => {
  beforeEach(() => MockBuilder(NoAccountPageComponent));

  it('should create', () => {
    const fixture = MockRender(NoAccountPageComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });
});
