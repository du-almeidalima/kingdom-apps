import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';
import { white100 } from '../../styles/abstract/variables';
import { SpinnerComponent} from '../spinner/spinner.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lib-floating-action-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./floating-action-button.component.scss'],
  template: `
    <lib-spinner [color]="spinnerColor" [hide]="!loading" width="3rem" height="3rem" />
    @if (!loading) {
      <ng-content />
    }
  `,
  imports: [SpinnerComponent],
})
export class FloatingActionButtonComponent implements OnInit {
  spinnerColor = white100;

  @Input()
  backgroundColor = white100;

  @Input()
  loading = false;

  constructor(private readonly renderer: Renderer2, private readonly elRef: ElementRef<HTMLButtonElement>) {}

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `floating-action-btn`);
    this.renderer.setStyle(this.elRef.nativeElement, '--backgroundColor', this.backgroundColor);
  }
}
