import { DatePipe } from '@angular/common';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { NotificationListItemComponent } from './notification-list-item.component';

describe('NotificationListItemComponent', () => {
  beforeEach(() => MockBuilder(NotificationListItemComponent).keep(DatePipe));

  const render = (category: NotificationCategoryEnum) =>
    MockRender(NotificationListItemComponent, {
      category,
      title: 'Manutenção no sábado',
      date: new Date(2026, 8, 1, 12, 0, 0),
    });

  it.each([
    [NotificationCategoryEnum.INFO, 'INFORMAÇÃO', 'info-lined'],
    [NotificationCategoryEnum.WARNING, 'ATENÇÃO', 'warning-lined'],
  ])('shows the %s category with its preset icon', (category, label, icon) => {
    const fixture = render(category);

    expect(
      ngMocks.find(fixture, '[data-testid="notification-list-item-category"]').nativeElement.textContent.trim(),
    ).toBe(label);
    expect(ngMocks.input(ngMocks.find(fixture, 'lib-icon'), 'icon')).toBe(icon);
  });

  it('shows the title and the date', () => {
    const fixture = render(NotificationCategoryEnum.INFO);
    const element: HTMLElement = fixture.point.nativeElement;

    expect(element.textContent).toContain('Manutenção no sábado');
    expect(element.textContent).toContain('01/09/2026');
  });
});
