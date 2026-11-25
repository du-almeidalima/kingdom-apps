import { TestBed } from '@angular/core/testing';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { of, throwError } from 'rxjs';

import { ToasterService } from '@kingdom-apps/common-ui';
import { UserStateService } from '../../../../state/user.state.service';
import { designationsHeaderMockBuilder } from '../../../../../test/mocks';
import { DesignationsHistoryBO } from '../../bo/designations-history/designations-history.bo';
import { DesignationsHeaderListItemComponent } from '../../components/designations-header-list-item/designations-header-list-item.component';
import { DesignationsHistoryPageComponent } from './designations-history-page.component';

describe('DesignationsHistoryPageComponent', () => {
  let bo: { getHeadersPage: jest.Mock };
  let toaster: { error: jest.Mock };
  beforeEach(() => {
    bo = { getHeadersPage: jest.fn().mockReturnValue(of({ headers: [], hasMore: false })) };
    toaster = { error: jest.fn() };
    return MockBuilder(DesignationsHistoryPageComponent)
      .mock(DesignationsHistoryBO, bo)
      .provide({ provide: UserStateService, useValue: { currentUser: { congregation: { id: 'C1' } } } })
      .provide({ provide: ToasterService, useValue: toaster });
  });

  it('renders the heading and header rows', () => {
    bo.getHeadersPage.mockReturnValue(of({ headers: [designationsHeaderMockBuilder({ id: 'H1' })], hasMore: false }));
    const fixture = MockRender(DesignationsHistoryPageComponent);
    expect(fixture.nativeElement.textContent).toContain('Histórico de designações');
    expect(ngMocks.findAll(fixture, DesignationsHeaderListItemComponent)).toHaveLength(1);
  });

  it('shows the empty state', () => {
    const fixture = MockRender(DesignationsHistoryPageComponent);
    expect(fixture.nativeElement.textContent).toContain('Nenhuma sessão de designações encontrada.');
  });

  it('loads the next page from the last createdAt and appends rows', () => {
    const first = designationsHeaderMockBuilder({ id: 'H1', createdAt: new Date('2026-09-01T12:00:00Z') });
    bo.getHeadersPage.mockReturnValueOnce(of({ headers: [first], hasMore: true })).mockReturnValueOnce(of({ headers: [designationsHeaderMockBuilder({ id: 'H2' })], hasMore: false }));
    const fixture = MockRender(DesignationsHistoryPageComponent);
    fixture.nativeElement.querySelector('[data-testid="designations-history-load-more"]').click();
    fixture.detectChanges();
    expect(bo.getHeadersPage).toHaveBeenLastCalledWith('C1', first.createdAt);
    expect(ngMocks.findAll(fixture, DesignationsHeaderListItemComponent)).toHaveLength(2);
    expect(ngMocks.findAll(fixture, '[data-testid="designations-history-load-more"]')).toHaveLength(0);
  });

  it('shows an error toast when loading fails', () => {
    bo.getHeadersPage.mockReturnValue(throwError(() => new Error('network')));
    MockRender(DesignationsHistoryPageComponent);
    expect(TestBed.inject(ToasterService).error).toHaveBeenCalledWith('Não foi possível carregar o histórico. Tente novamente.');
  });
});
