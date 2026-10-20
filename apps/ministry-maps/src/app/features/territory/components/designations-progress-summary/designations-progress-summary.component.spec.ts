import { MockBuilder, MockRender } from 'ng-mocks';

import { designationsHeaderMockBuilder } from '../../../../../test/mocks';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { DesignationsHeaderStatusEnum } from '../../../../../models/enums/designations-header-status';
import { DesignationsHeaderClosedByEnum } from '../../../../../models/enums/designations-header-closed-by';
import { DesignationsHeaderOverviewComponent } from '../designations-header-overview/designations-header-overview.component';
import { DesignationsProgressSummaryComponent } from './designations-progress-summary.component';

describe('DesignationsProgressSummaryComponent', () => {
  beforeEach(() => MockBuilder(DesignationsProgressSummaryComponent).keep(DesignationsHeaderOverviewComponent));
  it('shows the total, percent and outcome chips', () => {
    const fixture = MockRender(DesignationsProgressSummaryComponent, {
      header: designationsHeaderMockBuilder({ status: DesignationsHeaderStatusEnum.IN_PROGRESS }),
      progress: { territoriesTotal: 5, territoriesDone: 3, percent: 60, outcomeCounts: [{ outcome: VisitOutcomeEnum.SPOKE, count: 2 }], designations: [] },
    });
    expect(fixture.nativeElement.textContent).toContain('3 de 5 territórios concluídos');
    expect(fixture.nativeElement.textContent).toContain('60%');
    expect(fixture.nativeElement.textContent).toContain('Contatados 2');
  });
  it('shows the legacy progress message when progress is unavailable', () => {
    const fixture = MockRender(DesignationsProgressSummaryComponent, { header: designationsHeaderMockBuilder({}), progress: null });
    expect(fixture.nativeElement.textContent).toContain('Progresso indisponível para esta sessão.');
  });

  it.each([
    [DesignationsHeaderClosedByEnum.USER, 'Encerrada manualmente em'],
    [DesignationsHeaderClosedByEnum.CRON, 'Encerrada automaticamente em'],
  ])('shows the closure details when closed (%s)', (closedBy, text) => {
    const closedAt = new Date('2026-09-02T15:30:00Z');
    const fixture = MockRender(DesignationsProgressSummaryComponent, {
      header: designationsHeaderMockBuilder({ closedAt, closedBy }),
      progress: null,
    });
    expect(fixture.nativeElement.textContent).toContain(text);
  });
});
