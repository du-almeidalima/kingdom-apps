import { HeaderComponent } from './header.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { CommonComponentsModule } from '../common-components.module';

describe('HeaderComponent', () => {
  beforeEach(() => MockBuilder(HeaderComponent, [CommonComponentsModule]));

  it('should create', () => {
    const fixture = MockRender(HeaderComponent);
    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
