import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, inject, input } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lib-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./button.component.scss'],
  template: ` <ng-content></ng-content> `,
})
export class ButtonComponent implements OnInit {
  private readonly renderer = inject(Renderer2);
  private readonly elRef = inject<ElementRef<HTMLButtonElement>>(ElementRef);

  btnType = input<'secondary' | 'primary'>('secondary');

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `button--${this.btnType()}`);
  }
}
