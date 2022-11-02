import { ChangeDetectionStrategy, Component, ContentChild, Input } from '@angular/core';
import { InputComponent } from './input/input.component';
import { LabelComponent } from './label/label.component';

@Component({
  selector: 'lib-form-field',
  styleUrls: ['./form-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-field" [ngClass]="{ 'form-field--horizontal': orientation === 'horizontal' }">
      <ng-content select="[lib-label]"></ng-content>
      <ng-content></ng-content>
    </div>
  `,
})
export class FormFieldComponent {
  @Input()
  orientation: 'vertical' | 'horizontal' = 'vertical';

  // TODO: Create abstract class for inputs so it's possible to use this class as a token
  @ContentChild(InputComponent) inputComponent?: InputComponent;
  @ContentChild(LabelComponent) labelComponent?: LabelComponent;
}
