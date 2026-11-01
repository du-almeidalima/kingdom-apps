import { FormsModule } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { ButtonComponent, FormFieldComponent, InputComponent, LabelComponent } from '@kingdom-apps/common-ui';

import { CongregationNameFormComponent } from './congregation-name-form.component';

describe('CongregationNameFormComponent', () => {
  beforeEach(() =>
    MockBuilder(CongregationNameFormComponent)
      .keep(FormsModule)
      .keep(ButtonComponent)
      .keep(FormFieldComponent)
      .keep(InputComponent)
      .keep(LabelComponent),
  );

  it('disables the save button when empty or unchanged and emits trimmed name when saved', () => {
    const fixture = MockRender(CongregationNameFormComponent, {
      name: 'Congregação Central',
      disabled: false,
    });
    const comp = fixture.point.componentInstance;
    const saveSpy = jest.spyOn(comp.saveName, 'emit');
    const saveBtn = ngMocks.find(fixture, '[data-testid="config-save-name"]').nativeElement as HTMLButtonElement;

    expect(saveBtn.disabled).toBe(true);

    comp.nameInput.set('   ');
    fixture.detectChanges();
    expect(saveBtn.disabled).toBe(true);

    comp.nameInput.set('  Congregação Nova Esperança  ');
    fixture.detectChanges();
    expect(saveBtn.disabled).toBe(false);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="config-save-name"]'));
    expect(saveSpy).toHaveBeenCalledWith('Congregação Nova Esperança');
  });
});
