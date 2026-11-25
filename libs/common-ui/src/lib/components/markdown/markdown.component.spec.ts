import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { MarkdownComponent } from './markdown.component';

describe('MarkdownComponent', () => {
  beforeEach(() => MockBuilder(MarkdownComponent));

  it('renders headings, paragraphs, lists, emphasis and links', () => {
    const fixture = MockRender(MarkdownComponent, {
      content:
        '## Termos\n\nTexto **forte** e *itálico* com [site](https://example.com).\n\n- um\n- dois\n\n1. primeiro\n2. segundo',
    });

    expect(ngMocks.find(fixture, 'h2').nativeElement.textContent).toBe('Termos');
    expect(ngMocks.find(fixture, 'p strong').nativeElement.textContent).toBe('forte');
    expect(ngMocks.find(fixture, 'p em').nativeElement.textContent).toBe('itálico');
    expect(ngMocks.find(fixture, 'p a').nativeElement.getAttribute('href')).toBe('https://example.com');
    expect(ngMocks.findAll(fixture, 'ul > li')).toHaveLength(2);
    expect(ngMocks.findAll(fixture, 'ol > li')).toHaveLength(2);
  });

  it('strips scripts and unsafe link targets from the rendered HTML', () => {
    const fixture = MockRender(MarkdownComponent, {
      content: '<script>alert(1)</script>\n\n[clique](javascript:alert(1))',
    });
    const element: HTMLElement = fixture.point.nativeElement;

    expect(element.querySelector('script')).toBeNull();
    expect(element.querySelector('a')).not.toBeNull();
    expect(element.querySelector('a')?.getAttribute('href') ?? '').not.toMatch(/^javascript:/);
  });
});
