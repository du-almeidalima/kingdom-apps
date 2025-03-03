import { IconRadioComponent } from './icon-radio.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component, ViewChild } from '@angular/core';
import { grey400, IconComponent } from '@kingdom-apps/common-ui';
import { MoveResolutionActionsEnum } from '../../../features/territory/components/territory-move-alert-dialog/territory-move-alert-dialog.component';

@Component({
  template: `
    <form [formGroup]="form">
      <kingdom-apps-icon-radio formControlName="radioInput" [value]="MoveResolutionActions.MARK_AS_RESOLVED">
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

  form = new FormGroup({
    radioInput: new FormControl(MoveResolutionActionsEnum.MARK_AS_RESOLVED),
  });

  @ViewChild(IconRadioComponent)
  iconRadioComponent!: IconRadioComponent;
}

describe('IconRadioComponent', () => {
  beforeEach(() => MockBuilder([IconRadioComponent, TestingInputComponent, ReactiveFormsModule]));

  it('should create', async () => {
    const fixture = MockRender(TestingInputComponent);
    await fixture.whenStable();

    expect(fixture.point.componentInstance.iconRadioComponent).toBeTruthy();
  });
});
