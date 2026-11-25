import { UserListItemComponent } from './user-list-item.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { elderUser } from '../../../../../test/mocks';

describe('UserListItemComponent', () => {
  beforeEach(() => MockBuilder(UserListItemComponent));

  it('should create', () => {
    const fixture = MockRender(UserListItemComponent, { user: elderUser });

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
