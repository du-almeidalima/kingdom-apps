import { MockBuilder, MockRender } from 'ng-mocks';
import { RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ngMocks } from 'ng-mocks';

import { designationsHeaderMockBuilder } from '../../../../../test/mocks';
import { DesignationsHeaderClosedByEnum } from '../../../../../models/enums/designations-header-closed-by';
import { DesignationsHeaderOverviewComponent } from '../designations-header-overview/designations-header-overview.component';
import { DesignationsHeaderListItemComponent } from './designations-header-list-item.component';

describe('DesignationsHeaderListItemComponent', () => {
  beforeEach(() => MockBuilder(DesignationsHeaderListItemComponent).keep(DesignationsHeaderOverviewComponent));

  it.each([
    [DesignationsHeaderClosedByEnum.USER, 'Encerrada manualmente em'],
    [DesignationsHeaderClosedByEnum.CRON, 'Encerrada automaticamente em'],
  ])('shows the closure source', (closedBy, text) => {
    const header = designationsHeaderMockBuilder({ closedAt: new Date(2026, 8, 2), closedBy });
    const fixture = MockRender(DesignationsHeaderListItemComponent, { header });
    expect(fixture.nativeElement.textContent).toContain(text);
  });

  it('omits closure details for an open header and links to the header id', () => {
    const header = designationsHeaderMockBuilder({ id: 'target' });
    const fixture = MockRender(DesignationsHeaderListItemComponent, { header });
    expect(fixture.nativeElement.querySelector('[data-testid="designations-header-closure"]')).toBeNull();
    const link = fixture.debugElement.query(By.directive(RouterLink));
    expect(ngMocks.input(link, 'routerLink')).toEqual(['target']);
  });
});
