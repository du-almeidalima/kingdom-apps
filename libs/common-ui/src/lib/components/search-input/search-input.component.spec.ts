import { MockBuilder, MockRender } from 'ng-mocks';
import { SearchInputComponent } from './search-input.component';

describe('SearchInputComponent', () => {
  beforeEach(() => MockBuilder(SearchInputComponent));

  it('should create', () => {
    const component = MockRender(SearchInputComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
