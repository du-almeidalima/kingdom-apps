import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { IconButtonComponent } from './icon-button.component';

describe('IconButtonComponent', () => {
  beforeEach(() => MockBuilder(IconButtonComponent));

  it('adds the icon-button class to the host', () => {
    const fixture = MockRender(`<button lib-icon-button>x</button>`);

    expect(ngMocks.find(fixture, 'button').classes['icon-button']).toBe(true);
  });

  it('does not touch the style when no hoverBackgroundColor is given', () => {
    const fixture = MockRender(`<button lib-icon-button>x</button>`);

    expect(ngMocks.find(fixture, 'button').nativeElement.getAttribute('style')).toBeFalsy();
  });

  it('sets the hover background custom property on the host', () => {
    const fixture = MockRender(`<button lib-icon-button [hoverBackgroundColor]="bg">x</button>`, {
      bg: '#ff0000',
    });

    const style = ngMocks.find(fixture, 'button').nativeElement.getAttribute('style') ?? '';
    expect(style).toContain('--background-hover-color: #ff0000');
  });

  it('keeps styles already present on the host', () => {
    const fixture = MockRender(`<button lib-icon-button style="color: red" [hoverBackgroundColor]="bg">x</button>`, {
      bg: '#00ff00',
    });

    const style = ngMocks.find(fixture, 'button').nativeElement.getAttribute('style') ?? '';
    expect(style).toContain('color: red');
    expect(style).toContain('--background-hover-color: #00ff00');
  });
});
