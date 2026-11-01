import { IconRadioComponent } from './icon-radio.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component, viewChild } from '@angular/core';
import { grey400, IconComponent } from '@kingdom-apps/common-ui';
import { MoveResolutionActionsEnum } from '../../../features/territory/components/territory-move-alert-dialog/territory-move-alert-dialog.component';

@Component({
  template: `
    <form [formGroup]="form">
      <kingdom-apps-icon-radio
        formControlName="radioInput"
        [value]="MoveResolutionActions.MARK_AS_RESOLVED"
        [disabledOption]="isDisabled"
      >
        <lib-icon class="icon-radio__icon" icon="check-mark-circle-lined" [fillColor]="iconColor" />
        Remover Marcação
      </kingdom-apps-icon-radio>
    </form>
  `,
  imports: [IconRadioComponent, ReactiveFormsModule, IconComponent],
})
class TestingInputComponent {
  public readonly MoveResolutionActions = MoveResolutionActionsEnum;
  public readonly iconColor = grey400;
  public isDisabled = false;

  form = new FormGroup({
    radioInput: new FormControl(MoveResolutionActionsEnum.MARK_AS_RESOLVED),
  });

  iconRadioComponent = viewChild.required(IconRadioComponent);
}

describe('IconRadioComponent', () => {
  beforeEach(() => MockBuilder([IconRadioComponent, TestingInputComponent, ReactiveFormsModule]));

  it('should create', async () => {
    const fixture = MockRender(TestingInputComponent);
    await fixture.whenStable();

    expect(fixture.point.componentInstance.iconRadioComponent()).toBeTruthy();
  });

  it('should reflect disabledOption on the host and input', async () => {
    const fixture = MockRender(TestingInputComponent);
    fixture.point.componentInstance.isDisabled = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement.querySelector('kingdom-apps-icon-radio') as HTMLElement;
    expect(hostEl.getAttribute('aria-disabled')).toBe('true');
    expect(hostEl.hasAttribute('disabled')).toBe(true);

    const inputEl = fixture.nativeElement.querySelector('input.icon-radio__input') as HTMLInputElement;
    expect(inputEl.disabled).toBe(true);
  });
});
