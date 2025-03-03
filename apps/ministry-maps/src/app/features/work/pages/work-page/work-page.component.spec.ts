import { WorkPageComponent } from './work-page.component';
import { MockBuilder, MockInstance, MockRender } from 'ng-mocks';
import { WorkModule } from '../../work.module';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { RepositoriesModule } from '../../../../repositories/repositories-providers';
import { ActivatedRoute, RouterModule } from '@angular/router';

describe('WorkPageComponent', () => {
  // Resets customizations after each test, in our case of `ActivatedRoute`.
  MockInstance.scope();

  beforeEach(() => MockBuilder(WorkPageComponent, [RepositoriesModule, WorkModule, RouterModule.forRoot([])]));

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
