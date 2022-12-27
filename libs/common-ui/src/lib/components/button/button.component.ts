import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lib-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./button.component.scss'],
  template: ` <ng-content></ng-content> `,
})
export class ButtonComponent implements OnInit {
  @Input()
  btnType: 'secondary' | 'primary' = 'secondary';

  constructor(private readonly renderer: Renderer2, private readonly elRef: ElementRef<HTMLButtonElement>) {}

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `button--${this.btnType}`);
  }
}
