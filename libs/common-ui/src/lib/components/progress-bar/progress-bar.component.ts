import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'lib-progress-bar',
  template: '<div class="progress-bar__fill" [style.width.%]="percent()" data-testid="progress-bar-fill"></div>',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    '[attr.aria-valuenow]': 'percent()',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuetext]': 'percent() + "%"',
    '[attr.aria-label]': 'label()',
    '[class.progress-bar--animated]': 'animated()',
  },
})
export class ProgressBarComponent {
  value = input.required<number>();
  max = input.required<number>();
  label = input('');
  animated = input(false);

  protected readonly percent = computed(() => this.max() > 0 ? Math.min(100, Math.max(0, Math.round(this.value() / this.max() * 100))) : 0);
}
