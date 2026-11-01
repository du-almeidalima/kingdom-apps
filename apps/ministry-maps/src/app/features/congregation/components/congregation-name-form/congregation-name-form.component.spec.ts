import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { IconButtonComponent, IconComponent, InputComponent } from '@kingdom-apps/common-ui';

import { CongregationNameFormComponent } from './congregation-name-form.component';

describe('CongregationNameFormComponent', () => {
  beforeEach(() =>
    MockBuilder(CongregationNameFormComponent)
      .keep(IconButtonComponent)
      .keep(IconComponent)
      .keep(InputComponent)
  );

  it('shows the congregation name and enters edit mode from the pencil button', () => {
    const fixture = MockRender(CongregationNameFormComponent, {
      name: 'Congregação Central',
      disabled: false,
    });
    expect(ngMocks.find(fixture, '[data-testid="config-congregation-name"]').nativeElement.textContent).toContain(
      'Congregação Central',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="config-congregation-name-input"]')).toBeNull();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-edit-name"]'));
    fixture.detectChanges();

    const input = ngMocks.find(fixture, '[data-testid="config-congregation-name-input"]')
      .nativeElement as HTMLInputElement;
    expect(input.value).toBe('Congregação Central');
    expect(ngMocks.find(fixture, '[data-testid="config-cancel-name"]')).toBeTruthy();
  });

  it('guards empty and unchanged names and emits the trimmed name when saved', () => {
    const fixture = MockRender(CongregationNameFormComponent, {
      name: 'Congregação Central',
      disabled: false,
    });
    const comp = fixture.point.componentInstance;
    const saveSpy = jest.spyOn(comp.saveName, 'emit');
    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-edit-name"]'));
    fixture.detectChanges();
    const saveBtn = ngMocks.find(fixture, '[data-testid="config-save-name"]').nativeElement as HTMLButtonElement;

    expect(saveBtn.disabled).toBe(true);

    comp.nameDraft.set('   ');
    fixture.detectChanges();
    expect(saveBtn.disabled).toBe(true);

    comp.nameDraft.set('Congregação Central');
    fixture.detectChanges();
    expect(saveBtn.disabled).toBe(true);

    comp.nameDraft.set('  Congregação Nova Esperança  ');
    fixture.detectChanges();
    expect(saveBtn.disabled).toBe(false);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-save-name"]'));
    expect(saveSpy).toHaveBeenCalledWith('Congregação Nova Esperança');
  });

  it('cancels edit mode without emitting a name', () => {
    const fixture = MockRender(CongregationNameFormComponent, {
      name: 'Congregação Central',
      disabled: false,
    });
    const comp = fixture.point.componentInstance;
    const saveSpy = jest.spyOn(comp.saveName, 'emit');

    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-edit-name"]'));
    comp.nameDraft.set('Nome descartado');
    fixture.detectChanges();
    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-cancel-name"]'));
    fixture.detectChanges();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(ngMocks.find(fixture, '[data-testid="config-congregation-name"]').nativeElement.textContent).toContain(
      'Congregação Central',
    );
  });
});
