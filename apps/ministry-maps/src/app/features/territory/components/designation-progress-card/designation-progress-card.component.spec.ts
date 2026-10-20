import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { DesignationProgressSummary } from '../../models/designations-history.models';
import { DesignationProgressCardComponent } from './designation-progress-card.component';

describe('DesignationProgressCardComponent', () => {
  const summary: DesignationProgressSummary = {
    designationId: 'D1', index: 1, territoriesTotal: 2, territoriesDone: 1, percent: 50,
    createdAt: new Date('2026-09-01T12:00:00'), expiresAt: new Date('2026-09-02T12:00:00'), isExpired: true,
  };
  beforeEach(() => MockBuilder(DesignationProgressCardComponent));

  it('emits the designation id when toggled and exposes expanded state', () => {
    const fixture = MockRender(DesignationProgressCardComponent, { summary, expanded: true });
    const toggle = jest.fn();
    fixture.point.componentInstance.cardToggle.subscribe(toggle);
    ngMocks.find(fixture, '[data-testid="designation-progress-card-toggle"]').nativeElement.click();
    expect(toggle).toHaveBeenCalledWith('D1');
    expect(ngMocks.find(fixture, '[data-testid="designation-progress-card-toggle"]').nativeElement.getAttribute('aria-expanded')).toBe('true');
    expect(ngMocks.find(fixture, '[data-testid="designation-progress-card-toggle"]').nativeElement.getAttribute('aria-controls')).toBe('card-body-D1');
    expect(ngMocks.find(fixture, '[data-testid="designation-expired-badge"]').nativeElement.textContent).toContain('Expirada');
  });

  it('renders a spinner while loading expanded designation data', () => {
    const fixture = MockRender(DesignationProgressCardComponent, { summary, expanded: true, isLoading: true });
    expect(ngMocks.find(fixture, '[data-testid="designation-progress-loading"]')).toBeDefined();
    expect(ngMocks.findAll(fixture, '[data-testid="designation-territory-row"]')).toHaveLength(0);
  });

  it('shows rows, status labels and emits the share id', () => {
    const fixture = MockRender(DesignationProgressCardComponent, { summary, expanded: true, rows: [
      { territoryId: 'T1', address: 'Rua 1', city: 'Cidade', isDone: true, outcome: VisitOutcomeEnum.SPOKE },
      { territoryId: 'T2', address: 'Rua 2', city: 'Cidade', isDone: false },
    ] });
    expect(fixture.nativeElement.textContent).toContain('Concluído');
    expect(fixture.nativeElement.textContent).toContain('Pendente');
    expect(fixture.nativeElement.textContent).toContain('Contatados');
    const share = jest.fn();
    fixture.point.componentInstance.share.subscribe(share);
    ngMocks.find(fixture, '[data-testid="designation-share-button"]').nativeElement.click();
    expect(share).toHaveBeenCalledWith('D1');
  });

  it('shows a missing designation message when no rows are available', () => {
    const fixture = MockRender(DesignationProgressCardComponent, { summary, expanded: true, rows: null });
    expect(fixture.nativeElement.textContent).toContain('Designação não encontrada.');
  });
});
