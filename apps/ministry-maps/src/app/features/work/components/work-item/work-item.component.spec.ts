import { WorkItemComponent } from './work-item.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { WorkModule } from '../../work.module';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';

describe('WorkItemComponent', () => {
  beforeEach(() => MockBuilder(WorkItemComponent, [WorkModule]));

  it('should create', () => {
    const fixture = MockRender(WorkItemComponent, {
      territory: territoryMockBuilder({})
    });

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
