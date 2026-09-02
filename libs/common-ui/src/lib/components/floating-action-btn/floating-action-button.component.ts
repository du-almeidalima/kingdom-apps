import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, inject, input } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lib-floating-action-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./floating-action-button.component.scss'],
  template: `
    <lib-spinner [color]="spinnerColor" [hide]="!loading()" width="3rem" height="3rem" />
    @if (!loading()) {
      <ng-content />
    }
    @if ((badge() ?? 0) > 0) {
      <span class="floating-action-btn__badge" data-testid="fab-badge">{{ badge() }}</span>
    }
  `,
  imports: [SpinnerComponent],
})
export class FloatingActionButtonComponent implements OnInit {
  private readonly renderer = inject(Renderer2);
  private readonly elRef = inject<ElementRef<HTMLButtonElement>>(ElementRef);

  spinnerColor = 'currentColor';

  backgroundColor = input<string | undefined>(undefined);

  loading = input(false);

  /** Numeric chip rendered on the button's top-right corner; hidden while not a positive number. */
  badge = input<number>();

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `floating-action-btn`);
    if (this.backgroundColor()) {
      this.renderer.setStyle(this.elRef.nativeElement, '--backgroundColor', this.backgroundColor());
    }
  }
}
