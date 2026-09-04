import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { AssignTerritoriesDockComponent } from './assign-territories-dock.component';
import { IconComponent, SpinnerComponent } from '@kingdom-apps/common-ui';

describe('AssignTerritoriesDockComponent', () => {
  beforeEach(() => {
    return MockBuilder(AssignTerritoriesDockComponent).mock(IconComponent).mock(SpinnerComponent);
  });

  const renderDock = (
    inputs: Partial<{
      selectedCount: number;
      assignedCount: number;
      hasActiveSession: boolean;
      isCreatingAssignment: boolean;
      isStoppingSession: boolean;
    }> = {},
  ) => {
    const fixture = MockRender(AssignTerritoriesDockComponent, inputs);
    const component = fixture.point.componentInstance;

    return { fixture, component };
  };

  it('renders default state: 0 selected, no active session, submit and stop disabled', () => {
    const { fixture } = renderDock();

    const badge = ngMocks.find(fixture, '[data-testid="assign-dock-selected-badge"]');
    const selectedText = ngMocks.find(fixture, '[data-testid="assign-dock-selected-text"]');
    const assignedText = ngMocks.find(fixture, '[data-testid="assign-dock-assigned-text"]');
    const stopBtn = ngMocks.find(fixture, '[data-testid="assign-dock-stop-button"]');
    const submitBtn = ngMocks.find(fixture, '[data-testid="assign-dock-submit-button"]');

    expect(ngMocks.formatText(badge)).toBe('0');
    expect(ngMocks.formatText(selectedText)).toBe('Selecionado');
    expect(ngMocks.formatText(assignedText)).toBe('Nenhuma designação em andamento');
    expect(stopBtn.nativeElement.disabled).toBe(true);
    expect(submitBtn.nativeElement.disabled).toBe(true);
  });

  it('renders singular "Selecionado" and enables submit when 1 territory is selected', () => {
    const { fixture } = renderDock({ selectedCount: 1 });

    const badge = ngMocks.find(fixture, '[data-testid="assign-dock-selected-badge"]');
    const selectedText = ngMocks.find(fixture, '[data-testid="assign-dock-selected-text"]');
    const submitBtn = ngMocks.find(fixture, '[data-testid="assign-dock-submit-button"]');

    expect(ngMocks.formatText(badge)).toBe('1');
    expect(ngMocks.formatText(selectedText)).toBe('Selecionado');
    expect(badge.nativeElement.classList).toContain('assign-dock__badge--active');
    expect(submitBtn.nativeElement.disabled).toBe(false);
  });

  it('renders plural "Selecionados" when multiple territories are selected', () => {
    const { fixture } = renderDock({ selectedCount: 4 });

    const selectedText = ngMocks.find(fixture, '[data-testid="assign-dock-selected-text"]');
    expect(ngMocks.formatText(selectedText)).toBe('Selecionados');
  });

  it('renders active session information and enables stop button', () => {
    const { fixture } = renderDock({ hasActiveSession: true, assignedCount: 1 });

    const assignedText = ngMocks.find(fixture, '[data-testid="assign-dock-assigned-text"]');
    const stopBtn = ngMocks.find(fixture, '[data-testid="assign-dock-stop-button"]');

    expect(ngMocks.formatText(assignedText)).toBe('1 já designado');
    expect(stopBtn.nativeElement.disabled).toBe(false);
  });

  it('renders plural assigned count when multiple territories are assigned', () => {
    const { fixture } = renderDock({ hasActiveSession: true, assignedCount: 3 });

    const assignedText = ngMocks.find(fixture, '[data-testid="assign-dock-assigned-text"]');
    expect(ngMocks.formatText(assignedText)).toBe('3 já designados');
  });

  it('disables submit button and renders spinner when creation is in flight', () => {
    const { fixture } = renderDock({ selectedCount: 2, isCreatingAssignment: true });

    const submitBtn = ngMocks.find(fixture, '[data-testid="assign-dock-submit-button"]');
    expect(submitBtn.nativeElement.disabled).toBe(true);
    expect(ngMocks.find(submitBtn, 'lib-spinner')).toBeTruthy();
  });

  it('disables stop button and renders spinner when stopping is in flight', () => {
    const { fixture } = renderDock({ hasActiveSession: true, assignedCount: 2, isStoppingSession: true });

    const stopBtn = ngMocks.find(fixture, '[data-testid="assign-dock-stop-button"]');
    expect(stopBtn.nativeElement.disabled).toBe(true);
    expect(ngMocks.find(stopBtn, 'lib-spinner')).toBeTruthy();
  });

  it('emits stopClick output when clicking the stop button', () => {
    const stopSpy = jest.fn();
    const fixture = MockRender(AssignTerritoriesDockComponent, {
      hasActiveSession: true,
      assignedCount: 1,
    });
    fixture.point.componentInstance.stopClick.subscribe(stopSpy);

    const stopBtn = ngMocks.find(fixture, '[data-testid="assign-dock-stop-button"]');
    ngMocks.click(stopBtn);

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('emits submitClick output when clicking the submit button', () => {
    const submitSpy = jest.fn();
    const fixture = MockRender(AssignTerritoriesDockComponent, {
      selectedCount: 2,
    });
    fixture.point.componentInstance.submitClick.subscribe(submitSpy);

    const submitBtn = ngMocks.find(fixture, '[data-testid="assign-dock-submit-button"]');
    ngMocks.click(submitBtn);

    expect(submitSpy).toHaveBeenCalledTimes(1);
  });
});
