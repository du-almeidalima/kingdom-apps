import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Renderer2, inject } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[lib-icon-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./icon-button.component.scss'],
  template: ` <ng-content></ng-content> `,
})
export class IconButtonComponent implements OnInit {
  private readonly renderer = inject(Renderer2);
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input()
  hoverBackgroundColor?: string;

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `icon-button`);
    if (this.hoverBackgroundColor) {
      const currentStyle = this.elRef.nativeElement.getAttribute('style') || '';
      this.renderer.setProperty(
        this.elRef.nativeElement,
        `style`,
        `${currentStyle}
          --background-hover-color: ${this.hoverBackgroundColor};
        `
      );
    }
  }
}
