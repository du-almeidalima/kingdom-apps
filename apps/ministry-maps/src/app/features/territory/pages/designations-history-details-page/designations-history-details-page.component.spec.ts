import { ActivatedRoute } from '@angular/router';
import { MockBuilder, MockRender } from 'ng-mocks';
import { Subject, of } from 'rxjs';

import { Designation } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { designationsHeaderMockBuilder } from '../../../../../test/mocks';
import { DesignationsHistoryBO } from '../../bo/designations-history/designations-history.bo';
import { DesignationProgressCardComponent } from '../../components/designation-progress-card/designation-progress-card.component';
import { DesignationsProgressSummaryComponent } from '../../components/designations-progress-summary/designations-progress-summary.component';
import { DesignationsHeaderDetail } from '../../models/designations-history.models';
import { shareDesignationLink } from '../../../../shared/utils/share-utils';
import { DesignationsHistoryDetailsPageComponent } from './designations-history-details-page.component';

jest.mock('../../../../shared/utils/share-utils', () => ({ shareDesignationLink: jest.fn() }));

describe('DesignationsHistoryDetailsPageComponent', () => {
  let bo: { getHeaderDetailStream: jest.Mock; getDesignation: jest.Mock };
  let detail$: Subject<DesignationsHeaderDetail | undefined>;
  const header = designationsHeaderMockBuilder({ id: 'H1' });
  const designation: Designation = {
    id: 'D1',
    congregationId: 'C1',
    designationHeaderId: 'H1',
    territories: [{ ...territoryMockBuilder({ id: 'T1' }), status: DesignationStatusEnum.PENDING }],
    createdAt: new Date('2026-09-01T12:00:00Z'),
    createdBy: 'admin@example.test',
    expiresAt: new Date('2027-01-01T12:00:00Z'),
  };
  const progress = {
    territoriesTotal: 1,
    territoriesDone: 0,
    percent: 0,
    outcomeCounts: [],
    designations: [{
      designationId: 'D1', index: 1, territoriesTotal: 1, territoriesDone: 0, percent: 0,
      createdAt: designation.createdAt, expiresAt: designation.expiresAt, isExpired: false,
    }],
  };

  beforeEach(() => {
    detail$ = new Subject<DesignationsHeaderDetail | undefined>();
    bo = { getHeaderDetailStream: jest.fn().mockReturnValue(detail$), getDesignation: jest.fn().mockReturnValue(of(designation)) };
    jest.clearAllMocks();
    return MockBuilder(DesignationsHistoryDetailsPageComponent)
      .keep(DesignationProgressCardComponent)
      .keep(DesignationsProgressSummaryComponent)
      .provide({ provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'H1' } } } })
      .provide({ provide: DesignationsHistoryBO, useValue: bo });
  });

  it('renders loading, then not-found when the header is missing', () => {
    const fixture = MockRender(DesignationsHistoryDetailsPageComponent);
    expect(fixture.nativeElement.querySelector('[data-testid="designations-history-details-loading"]')).toBeTruthy();
    detail$.next(undefined);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sessão de designações não encontrada.');
  });

  it('renders summary content and updates from the live stream', () => {
    const fixture = MockRender(DesignationsHistoryDetailsPageComponent);
    detail$.next({ header, progress, rawTerritories: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('0 de 1 territórios concluídos');
    detail$.next({ header, progress: { ...progress, territoriesDone: 1, percent: 100 }, rawTerritories: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 de 1 territórios concluídos');
  });

  it('shows unavailable progress for a legacy header', () => {
    const fixture = MockRender(DesignationsHistoryDetailsPageComponent);
    detail$.next({ header, progress: null, rawTerritories: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Progresso indisponível para esta sessão.');
  });

  it('loads an expanded designation once and shares its work link', () => {
    const fixture = MockRender(DesignationsHistoryDetailsPageComponent);
    detail$.next({ header, progress, rawTerritories: {} });
    fixture.detectChanges();

    const toggle = () => fixture.nativeElement.querySelector('[data-testid="designation-progress-card-toggle"]') as HTMLButtonElement;
    toggle().click();
    fixture.detectChanges();
    expect(bo.getDesignation).toHaveBeenCalledTimes(1);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');

    toggle().click();
    fixture.detectChanges();
    toggle().click();
    fixture.detectChanges();
    expect(bo.getDesignation).toHaveBeenCalledTimes(1);

    fixture.nativeElement.querySelector('[data-testid="designation-share-button"]').click();
    expect(shareDesignationLink).toHaveBeenCalledWith('D1');
  });
});
