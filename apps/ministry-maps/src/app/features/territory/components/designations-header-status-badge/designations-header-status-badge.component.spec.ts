import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { IconComponent } from '@kingdom-apps/common-ui';

import { DesignationsHeaderStatusEnum } from '../../../../../models/enums/designations-header-status';
import { DesignationsHeaderStatusBadgeComponent } from './designations-header-status-badge.component';

describe('DesignationsHeaderStatusBadgeComponent', () => {
  beforeEach(() => MockBuilder(DesignationsHeaderStatusBadgeComponent));
  it.each([
    [DesignationsHeaderStatusEnum.IN_PROGRESS, 'Em andamento', 'badge--info', 'stop-circle-lined'],
    [DesignationsHeaderStatusEnum.DONE, 'Encerrada', 'badge--muted', 'check-mark-circle-lined'],
  ])('renders %s', (status, text, cssClass, icon) => {
    const fixture = MockRender(DesignationsHeaderStatusBadgeComponent, { status });
    expect(fixture.nativeElement.textContent).toContain(text);
    expect(fixture.nativeElement.querySelector('[data-testid="designations-header-status-badge"]').classList).toContain(cssClass);
    expect(ngMocks.find(fixture, IconComponent).componentInstance.icon()).toBe(icon);
  });
});
