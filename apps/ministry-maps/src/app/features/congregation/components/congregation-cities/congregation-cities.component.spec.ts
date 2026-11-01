import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { ButtonComponent, IconButtonComponent, IconComponent, InputComponent } from '@kingdom-apps/common-ui';

import { CongregationCitiesComponent } from './congregation-cities.component';

describe('CongregationCitiesComponent', () => {
  beforeEach(() =>
    MockBuilder(CongregationCitiesComponent)
      .keep(FormsModule)
      .keep(ButtonComponent)
      .keep(IconButtonComponent)
      .keep(IconComponent)
      .keep(InputComponent)
  );

  it('renders city rows with territory counts', () => {
    const fixture = MockRender(CongregationCitiesComponent, {
      cities: ['City 1', 'City 2'],
      territoryCounts: { 'City 1': 1, 'City 2': 0 },
      disabled: false,
    });
    expect(ngMocks.findAll(fixture, '[data-testid="config-city-row"]')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('1 território');
    expect(fixture.nativeElement.textContent).toContain('0 territórios');
  });

  it('renders the empty state when no cities exist', () => {
    const fixture = MockRender(CongregationCitiesComponent, {
      cities: [],
      disabled: false,
    });
    expect(ngMocks.find(fixture, '[data-testid="config-empty-cities"]')).toBeTruthy();
  });

  it('emits addCity when clicking the add button', () => {
    const fixture = MockRender(CongregationCitiesComponent, {
      cities: ['City 1'],
      disabled: false,
    });
    const comp = fixture.point.componentInstance;
    const addSpy = jest.spyOn(comp.addCity, 'emit');

    comp.newCityName.set('City 2');
    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-add-city"]'));

    expect(addSpy).toHaveBeenCalledWith('City 2');
  });

  it('allows one city row in inline edit mode at a time, cancels cleanly, and emits renameCity on save', () => {
    const fixture = MockRender(CongregationCitiesComponent, {
      cities: ['City 1', 'City 2'],
      disabled: false,
    });
    const comp = fixture.point.componentInstance;
    const renameSpy = jest.spyOn(comp.renameCity, 'emit');

    ngMocks.click(ngMocks.findAll(fixture, '[data-testid="config-edit-city"]')[0]);
    fixture.detectChanges();

    // Remaining edit buttons are disabled while one row is editing
    const otherEditButtons = ngMocks.findAll(fixture, '[data-testid="config-edit-city"]');
    expect(otherEditButtons.every((b) => b.nativeElement.disabled)).toBe(true);

    // Cancel exits edit mode without emitting
    comp.editingCityValue.set('Changed Name');
    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-cancel-city"]'));
    fixture.detectChanges();
    expect(renameSpy).not.toHaveBeenCalled();

    // Save emits renameCity
    ngMocks.click(ngMocks.findAll(fixture, '[data-testid="config-edit-city"]')[0]);
    fixture.detectChanges();
    comp.editingCityValue.set('City 1 Renomeada');
    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-save-city"]'));

    expect(renameSpy).toHaveBeenCalledWith({
      oldName: 'City 1',
      newName: 'City 1 Renomeada',
    });
  });

  it('renders icon-only actions with accessible labels', () => {
    const fixture = MockRender(CongregationCitiesComponent, {
      cities: ['City 1'],
      territoryCounts: {},
      disabled: false,
    });

    expect(ngMocks.find(fixture, '[data-testid="config-edit-city"]').nativeElement.getAttribute('aria-label')).toBe(
      'Editar cidade',
    );
    expect(ngMocks.find(fixture, '[data-testid="config-delete-city"]').nativeElement.getAttribute('aria-label')).toBe(
      'Remover cidade',
    );
  });

  it('emits reorderCities on drag drop and removeCity on delete click', () => {
    const fixture = MockRender(CongregationCitiesComponent, {
      cities: ['City 1', 'City 2', 'City 3'],
      disabled: false,
    });
    const comp = fixture.point.componentInstance;
    const reorderSpy = jest.spyOn(comp.reorderCities, 'emit');
    const removeSpy = jest.spyOn(comp.removeCity, 'emit');

    comp.handleCityDrop({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<string[]>);
    expect(reorderSpy).toHaveBeenCalledWith(['City 2', 'City 3', 'City 1']);

    ngMocks.click(ngMocks.findAll(fixture, '[data-testid="config-delete-city"]')[0]);
    expect(removeSpy).toHaveBeenCalledWith('City 1');
  });
});
