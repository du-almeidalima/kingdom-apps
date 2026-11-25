import { MockBuilder, MockRender } from 'ng-mocks';

import { ProgressBarComponent } from './progress-bar.component';

describe('ProgressBarComponent', () => {
  beforeEach(() => MockBuilder(ProgressBarComponent));

  it('rounds progress and exposes accessible values', () => {
    const fixture = MockRender(ProgressBarComponent, { value: 1, max: 3, label: 'Visitas' });
    const host = fixture.point.nativeElement as HTMLElement;
    expect(host.getAttribute('aria-valuenow')).toBe('33');
    expect(host.getAttribute('aria-valuemin')).toBe('0');
    expect(host.getAttribute('aria-valuemax')).toBe('100');
    expect(host.getAttribute('aria-valuetext')).toBe('33%');
    expect(host.getAttribute('aria-label')).toBe('Visitas');
    expect(host.querySelector('[data-testid="progress-bar-fill"]')?.getAttribute('style')).toContain('33%');
  });

  it.each([[4, 3, 100], [-1, 3, 0], [2, 0, 0]])('clamps %s/%s to %s percent', (value, max, expected) => {
    const fixture = MockRender(ProgressBarComponent, { value, max });
    expect(fixture.point.nativeElement.getAttribute('aria-valuenow')).toBe(String(expected));
  });

  it('applies the animated host class when animated is true', () => {
    const fixture = MockRender(ProgressBarComponent, { value: 1, max: 2, animated: true });
    expect(fixture.point.nativeElement.classList.contains('progress-bar--animated')).toBe(true);
  });
});
