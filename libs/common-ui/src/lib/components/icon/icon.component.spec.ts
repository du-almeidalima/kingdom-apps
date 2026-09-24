import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  beforeEach(() => {
    return MockBuilder(IconComponent);
  });

  it('should create', () => {
    const fixture = MockRender(IconComponent);
    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should default fillColor to currentColor', () => {
    const fixture = MockRender(IconComponent);
    expect(fixture.point.componentInstance.fillColor()).toBe('currentColor');
  });

  it('should set icon input property', () => {
    const testIcon = 'check-mark-circle-thin';
    const fixture = MockRender(IconComponent, { icon: testIcon });

    const iconElement = ngMocks.find(fixture, 'use');
    expect(iconElement.attributes['href']).toContain(testIcon);
  });
});
