import { AssignTerritoriesPageComponent } from './assign-territories-page.component';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { EMPTY, Subject, of } from 'rxjs';
import { FloatingActionButtonComponent } from '@kingdom-apps/common-ui';

import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { Designation } from '../../../../../models/designation';
import { mockTerritory1, mockTerritory2 } from '../../../../../test/mocks';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('AssignTerritoriesPageComponent', () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    return MockBuilder(AssignTerritoriesPageComponent, [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO])
      .provide(MOCK_REPOSITORIES_PROVIDERS)
      .keep(FloatingActionButtonComponent);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  const render = (): { fixture: ReturnType<typeof MockRender<AssignTerritoriesPageComponent>>; component: AssignTerritoriesPageComponent } => {
    const fixture = MockRender(AssignTerritoriesPageComponent);
    const component = fixture.point.componentInstance as AssignTerritoriesPageComponent;

    return { fixture, component };
  };

  const submitDesignation = (component: AssignTerritoriesPageComponent, designationId: string) => {
    const territoryBO = ngMocks.get(TerritoryBO) as jest.Mocked<TerritoryBO>;
    territoryBO.createDesignationForTerritories.mockReturnValue(of({ id: designationId } as Designation));

    component.handleTerritoryFormSubmit();
  };

  it('should create', () => {
    const fixture = MockRender(AssignTerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('renders the selected count on the FAB badge', () => {
    const { fixture, component } = render();

    expect(component.selectedCount()).toBe(0);
    expect(ngMocks.findAll(fixture, '[data-testid="fab-badge"]')).toHaveLength(0);

    component.handleTerritoryCheck(true, mockTerritory1);
    fixture.detectChanges();

    expect(component.selectedCount()).toBe(1);
    expect(ngMocks.formatText(ngMocks.find(fixture, '[data-testid="fab-badge"]'))).toContain('1');
  });

  it('populates assignedDesignations on successful submit and clears only the submitted territories', () => {
    const { component } = render();
    component.handleTerritoryCheck(true, mockTerritory1);
    component.handleTerritoryCheck(true, mockTerritory2);

    submitDesignation(component, 'DESIG-1');

    expect(component.assignedDesignations().get('DESIG-1')).toEqual(new Set([mockTerritory1.id, mockTerritory2.id]));
    expect(component.selectedCount()).toBe(0);
    expect(component.hasAlreadyBeenSelected(mockTerritory1.id)).toBe(true);
    expect(component.isTerritoryAssigned(mockTerritory1.id)).toBe(true);
    expect(component.designationIdForTerritory(mockTerritory2.id)).toBe('DESIG-1');
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('DESIG-1'));
  });

  it('keeps the ticks and marks nothing as assigned when creation fails', () => {
    const { component } = render();
    component.handleTerritoryCheck(true, mockTerritory1);

    const territoryBO = ngMocks.get(TerritoryBO) as jest.Mocked<TerritoryBO>;
    territoryBO.createDesignationForTerritories.mockReturnValue(EMPTY);
    component.handleTerritoryFormSubmit();

    expect(component.assignedDesignations().size).toBe(0);
    expect(component.isTerritoryAssigned(mockTerritory1.id)).toBe(false);
    expect(component.selectedCount()).toBe(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('blocks a double submission while the designation creation is in flight', () => {
    const { component } = render();
    component.handleTerritoryCheck(true, mockTerritory1);

    const territoryBO = ngMocks.get(TerritoryBO) as jest.Mocked<TerritoryBO>;
    const creation$ = new Subject<Designation>();
    territoryBO.createDesignationForTerritories.mockReturnValue(creation$.asObservable());

    component.handleTerritoryFormSubmit();
    expect(component.isCreatingAssignment()).toBe(true);

    // Re-submitting while in flight is ignored: no duplicate designation, no duplicate share.
    component.handleTerritoryFormSubmit();
    expect(territoryBO.createDesignationForTerritories).toHaveBeenCalledTimes(1);

    creation$.next({ id: 'DESIG-1' } as Designation);
    creation$.complete();

    expect(component.assignedDesignations().size).toBe(1);
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
});
