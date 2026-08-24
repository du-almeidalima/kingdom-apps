import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { DesignationNotFoundComponent } from './designation-not-found.component';

describe('DesignationNotFoundComponent', () => {
  beforeEach(() => MockBuilder(DesignationNotFoundComponent));

  it('creates', () => {
    const fixture = MockRender(DesignationNotFoundComponent);
    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('shows the heading and asks the user to reach out to the SG in Portuguese', () => {
    const fixture = MockRender(DesignationNotFoundComponent);

    const heading = ngMocks.find(fixture, 'h2');
    expect(ngMocks.formatText(heading)).toBe('Designação não encontrada');

    const paragraphs = ngMocks.findAll(fixture, 'p');
    expect(ngMocks.formatText(paragraphs[0])).toBe(
      'Não foi possível encontrar esta designação. Ela pode ter expirado ou ter sido removida.',
    );
    expect(ngMocks.formatText(paragraphs[1])).toContain('Superintendente de Grupo (SG)');
  });
});
