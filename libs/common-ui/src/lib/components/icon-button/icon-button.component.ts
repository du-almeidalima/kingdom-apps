import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2 } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[lib-icon-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./icon-button.component.scss'],
  template: ` <ng-content></ng-content> `,
})
export class IconButtonComponent implements OnInit {
  constructor(private readonly renderer: Renderer2, private readonly elRef: ElementRef<HTMLElement>) {}

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `icon-button`);
  }
}
