import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-spinner',
  styleUrls: ['./spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="spinner"
      [style]="{ '--height': height(), '--width': width(), '--color': color() }"
      [hidden]="hide()"
    >
      <div class="spinner__inner-block"></div>
    </div>
  `,
})
export class SpinnerComponent {
  height = input('2rem');

  width = input('2rem');

  hide = input(false);

  color = input('var(--kui-color-action-primary, #07AB3B)');
}
