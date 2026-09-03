import { AssignTerritoriesPageComponent } from './assign-territories-page.component';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { EMPTY, Subject, of } from 'rxjs';
import { Dialog } from '@angular/cdk/dialog';
import { ConfirmDialogComponent, FloatingActionButtonComponent, ToasterService } from '@kingdom-apps/common-ui';

import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { DesignationsHeaderBO } from '../../bo/designations-header/designations-header.bo';
import { AssignTerritoriesStateService } from '../../state/assign-territories.state.service';
import { Designation } from '../../../../../models/designation';
import { DesignationsHeader } from '../../../../../models/designations-header';
import {
  mockTerritory1,
  mockTerritory2,
  designationsHeaderMockBuilder,
  congregationMock,
} from '../../../../../test/mocks';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

const header: DesignationsHeader = designationsHeaderMockBuilder({ id: 'HEADER-1' });

const designationInSession = (designationId: string, territoryIds: string[]): Designation =>
  ({ id: designationId, territories: territoryIds.map((id) => ({ id })) }) as unknown as Designation;

const getBO = () => ngMocks.get(DesignationsHeaderBO) as jest.Mocked<DesignationsHeaderBO>;
const getDialog = () => ngMocks.get(Dialog) as jest.Mocked<Dialog>;
const getToaster = () => ngMocks.get(ToasterService) as jest.Mocked<ToasterService>;

describe('AssignTerritoriesPageComponent', () => {
  let openSpy: jest.SpyInstance;

  MockInstance.scope('case');

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    MockInstance(DesignationsHeaderBO, (instance) => {
      const bo = instance as jest.Mocked<DesignationsHeaderBO>;
      bo.getActiveSessionStream.mockReturnValue(of({ header: null, designations: [] }));
      bo.createDesignation.mockReturnValue(of({ designation: designationInSession('DESIG-1', []), header }));
      bo.closeHeader.mockReturnValue(of(void 0));
    });
    MockInstance(Dialog, (instance) => {
      (instance as jest.Mocked<Dialog>).open.mockReturnValue({ closed: of(false) } as never);
    });

    return (
      MockBuilder(AssignTerritoriesPageComponent, [TerritoryAlertsBO])
        .mock(DesignationsHeaderBO)
        .mock(Dialog)
        .mock(ToasterService)
        .provide(MOCK_REPOSITORIES_PROVIDERS)
        // Real state service (its own spec covers it).
        .provide(AssignTerritoriesStateService)
        .keep(FloatingActionButtonComponent)
    );
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  const render = (): {
    fixture: ReturnType<typeof MockRender<AssignTerritoriesPageComponent>>;
    component: AssignTerritoriesPageComponent;
    state: AssignTerritoriesStateService;
  } => {
    const fixture = MockRender(AssignTerritoriesPageComponent);
    const component = fixture.point.componentInstance as AssignTerritoriesPageComponent;

    return { fixture, component, state: component.state };
  };

  const submitDesignation = (component: AssignTerritoriesPageComponent, designationId: string) => {
    getBO().createDesignation.mockReturnValue(of({ designation: designationInSession(designationId, []), header }));

    component.handleTerritoryFormSubmit();
  };

  const resumeWith = (designations: Designation[]) => {
    MockInstance(DesignationsHeaderBO, (instance) => {
      (instance as jest.Mocked<DesignationsHeaderBO>).getActiveSessionStream.mockReturnValue(
        of({ header, designations }),
      );
    });
  };

  it('should create', () => {
    const fixture = MockRender(AssignTerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('resumes the congregation session stream on init', () => {
    const { component } = render();

    expect(component.state.header()).toBeNull();
    expect(getBO().getActiveSessionStream).toHaveBeenCalledWith(congregationMock.id);
  });

  it('renders the selected count on the FAB badge', () => {
    const { fixture, component } = render();

    expect(component.state.selectedCount()).toBe(0);
    expect(ngMocks.findAll(fixture, '[data-testid="fab-badge"]')).toHaveLength(0);

    component.handleTerritoryCheck(true, mockTerritory1);
    fixture.detectChanges();

    expect(component.state.selectedCount()).toBe(1);
    expect(ngMocks.formatText(ngMocks.find(fixture, '[data-testid="fab-badge"]'))).toContain('1');
  });

  describe('resume banner', () => {
    it('hydrates the session and renders the banner with the stop button', () => {
      resumeWith([designationInSession('D1', [mockTerritory1.id])]);

      const { fixture, component } = render();

      expect(component.state.hasActiveSession()).toBe(true);
      expect(component.isTerritoryAssigned(mockTerritory1.id)).toBe(true);
      expect(component.designationIdForTerritory(mockTerritory1.id)).toBe('D1');

      const banner = ngMocks.find(fixture, '[data-testid="assign-resume-banner"]');
      expect(ngMocks.formatText(banner)).toContain('Designações em andamento');
      expect(ngMocks.formatText(banner)).toContain('1 território já designado');
      expect(ngMocks.find(fixture, '[data-testid="assign-stop-button"]')).toBeTruthy();
    });

    it('renders the plural copy when more than one territory is assigned', () => {
      resumeWith([designationInSession('D1', [mockTerritory1.id, mockTerritory2.id])]);

      const { fixture } = render();

      expect(ngMocks.formatText(ngMocks.find(fixture, '[data-testid="assign-resume-banner"]'))).toContain(
        '2 territórios já designados',
      );
    });

    it('renders no banner when there is no active session', () => {
      const { fixture } = render();

      expect(ngMocks.findAll(fixture, '[data-testid="assign-resume-banner"]')).toHaveLength(0);
    });
  });

  it('populates assignedDesignations on successful submit and clears only the submitted territories', () => {
    const { component } = render();
    component.handleTerritoryCheck(true, mockTerritory1);
    component.handleTerritoryCheck(true, mockTerritory2);

    submitDesignation(component, 'DESIG-1');

    expect(component.state.assignedDesignations().get('DESIG-1')).toEqual(
      new Set([mockTerritory1.id, mockTerritory2.id]),
    );
    expect(component.state.selectedCount()).toBe(0);
    expect(component.hasAlreadyBeenSelected(mockTerritory1.id)).toBe(true);
    expect(component.isTerritoryAssigned(mockTerritory1.id)).toBe(true);
    expect(component.designationIdForTerritory(mockTerritory2.id)).toBe('DESIG-1');
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('DESIG-1'));
  });

  it('keeps the ticks and marks nothing as assigned when creation fails', () => {
    const { component } = render();
    component.handleTerritoryCheck(true, mockTerritory1);

    getBO().createDesignation.mockReturnValue(EMPTY);
    component.handleTerritoryFormSubmit();

    expect(component.state.assignedDesignations().size).toBe(0);
    expect(component.isTerritoryAssigned(mockTerritory1.id)).toBe(false);
    expect(component.state.selectedCount()).toBe(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('blocks a double submission while the designation creation is in flight', () => {
    const { component } = render();
    component.handleTerritoryCheck(true, mockTerritory1);

    const creation$ = new Subject<{ designation: Designation; header: DesignationsHeader }>();
    getBO().createDesignation.mockReturnValue(creation$.asObservable());

    component.handleTerritoryFormSubmit();
    expect(component.state.isCreatingAssignment()).toBe(true);

    // Re-submitting while in flight is ignored: no duplicate designation, no duplicate share.
    component.handleTerritoryFormSubmit();
    expect(getBO().createDesignation).toHaveBeenCalledTimes(1);

    creation$.next({ designation: designationInSession('DESIG-1', [mockTerritory1.id]), header });
    creation$.complete();

    expect(component.state.assignedDesignations().size).toBe(1);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('re-triggers the share when an assigned territory is tapped', () => {
    const { component } = render();
    component.handleTerritoryCheck(true, mockTerritory1);
    submitDesignation(component, 'DESIG-1');
    expect(openSpy).toHaveBeenCalledTimes(1);

    component.handleAssignedTerritoryClick(mockTerritory1.id);

    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(openSpy).toHaveBeenLastCalledWith(expect.stringContaining('DESIG-1'));
  });

  it('does nothing when tapping a territory that has no designation', () => {
    const { component } = render();

    component.handleAssignedTerritoryClick('UNKNOWN-TERRITORY');

    expect(openSpy).not.toHaveBeenCalled();
  });

  describe('stop flow', () => {
    const renderWithActiveSession = () => {
      resumeWith([designationInSession('D1', [mockTerritory1.id])]);

      const rendered = render();
      rendered.fixture.detectChanges();

      return rendered;
    };

    it('asks for confirmation with the verbatim dialog copy', () => {
      const { component } = renderWithActiveSession();

      component.handleStopClick();

      expect(getDialog().open).toHaveBeenCalledWith(ConfirmDialogComponent, {
        data: {
          title: 'Encerrar designações?',
          bodyText: 'Os territórios já designados serão mantidos. Novas designações iniciarão um novo ciclo.',
        },
      });
    });

    it('closes the session and toasts on confirmation', () => {
      MockInstance(Dialog, (instance) => {
        (instance as jest.Mocked<Dialog>).open.mockReturnValue({ closed: of(true) } as never);
      });

      const { component, fixture } = renderWithActiveSession();

      component.handleStopClick();
      fixture.detectChanges();

      expect(getBO().closeHeader).toHaveBeenCalledWith(header.id);
      expect(component.state.hasActiveSession()).toBe(false);
      expect(component.state.assignedTerritoryCount()).toBe(0);
      expect(ngMocks.findAll(fixture, '[data-testid="assign-resume-banner"]')).toHaveLength(0);
      expect(getToaster().success).toHaveBeenCalledWith('Designações em andamento encerradas com sucesso.');
    });

    it('keeps the session when the user cancels', () => {
      MockInstance(Dialog, (instance) => {
        (instance as jest.Mocked<Dialog>).open.mockReturnValue({ closed: of(false) } as never);
      });

      const { component } = renderWithActiveSession();

      component.handleStopClick();

      expect(getBO().closeHeader).not.toHaveBeenCalled();
      expect(component.state.hasActiveSession()).toBe(true);
      expect(getToaster().success).not.toHaveBeenCalled();
    });
  });
});
