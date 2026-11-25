import { MockBuilder, MockRender } from 'ng-mocks';

import { DividerComponent } from './divider.component';

describe('DividerComponent', () => {
  beforeEach(() => MockBuilder(DividerComponent));

  it('renders a semantic hr element with default spacing', () => {
    const fixture = MockRender(DividerComponent);
    const hr = fixture.nativeElement.querySelector('hr[data-testid="divider"]') as HTMLHRElement | null;

    expect(hr).not.toBeNull();
    expect(hr?.classList.contains('divider')).toBe(true);
    expect(hr?.style.marginBlock).toBe('1.6rem');
  });

  it('applies custom spacing when provided', () => {
    const fixture = MockRender(DividerComponent, { spacing: '2.4rem' });
    const hr = fixture.nativeElement.querySelector('hr[data-testid="divider"]') as HTMLHRElement | null;

    expect(hr?.style.marginBlock).toBe('2.4rem');
  });
});
