import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { SectionComponent } from './section.component';

describe('SectionComponent', () => {
  beforeEach(() => MockBuilder(SectionComponent));

  it('renders the title and projected content', () => {
    const fixture = MockRender(
      `<kingdom-apps-section title="My Section"><p data-testid="projected">content</p></kingdom-apps-section>`,
      {},
      { detectChanges: false }
    );
    fixture.detectChanges();

    expect(ngMocks.find(fixture, '.section__title').nativeElement.textContent.trim()).toBe('My Section');
    expect(ngMocks.find(fixture, '[data-testid="projected"]').nativeElement.textContent.trim()).toBe('content');
  });

  it('shows the loading spinner only while isLoading', () => {
    const fixture = MockRender<SectionComponent>(
      `<kingdom-apps-section [title]="'T'" [isLoading]="loading"><p>x</p></kingdom-apps-section>`,
      { loading: true }
    );

    expect(ngMocks.find(fixture, 'lib-spinner')).toBeTruthy();

    fixture.componentInstance['loading'] = false;
    fixture.detectChanges();

    expect(ngMocks.find(fixture, 'lib-spinner', undefined)).toBeUndefined();
  });
});
