import { WorkPageComponent } from './work-page.component';
import { MockBuilder, MockInstance, MockRender } from 'ng-mocks';
import { ActivatedRoute } from '@angular/router';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('WorkPageComponent', () => {
  // Resets customizations after each test, in our case of `ActivatedRoute`.
  MockInstance.scope();

  beforeEach(() => MockBuilder(WorkPageComponent).mock(ActivatedRoute).provide(MOCK_REPOSITORIES_PROVIDERS));

  it('should create', () => {
    MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
      paramMap: new Map([['id', '12345']]),
    });

    const fixture = MockRender(WorkPageComponent, {
      territory: territoryMockBuilder({}),
    });

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
