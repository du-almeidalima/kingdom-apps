import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[lib-icon-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./icon-button.component.scss'],
  template: ` <ng-content></ng-content> `,
})
export class IconButtonComponent implements OnInit {
  constructor(private readonly renderer: Renderer2, private readonly elRef: ElementRef<HTMLElement>) {}

  @Input()
  hoverBackgroundColor = '#dfdddd';

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `icon-button`);
    this.renderer.setProperty(
      this.elRef.nativeElement,
      `style`,
      `
        --background-hover-color: ${this.hoverBackgroundColor}
      `
    );
  }
}
