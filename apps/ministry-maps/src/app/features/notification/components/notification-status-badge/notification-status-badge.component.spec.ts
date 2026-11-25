import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { NotificationStatusEnum } from '../../../../../models/enums/notification-status';
import { NotificationStatusBadgeComponent } from './notification-status-badge.component';

describe('NotificationStatusBadgeComponent', () => {
  beforeEach(() => MockBuilder(NotificationStatusBadgeComponent));

  it.each([
    [NotificationStatusEnum.ACTIVE, 'Ativa'],
    [NotificationStatusEnum.INACTIVE, 'Inativa'],
  ])('labels a %s notification as %s', (status, label) => {
    const fixture = MockRender(NotificationStatusBadgeComponent, { status });

    expect(ngMocks.find(fixture, '[data-testid="notification-status-badge"]').nativeElement.textContent.trim()).toBe(
      label,
    );
  });
});
