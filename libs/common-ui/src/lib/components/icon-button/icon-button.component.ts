import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, inject, input } from '@angular/core';

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

  hoverBackgroundColor = input<string | undefined>(undefined);

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `icon-button`);
    if (this.hoverBackgroundColor()) {
      const currentStyle = this.elRef.nativeElement.getAttribute('style') || '';
      this.renderer.setProperty(
        this.elRef.nativeElement,
        `style`,
        `${currentStyle}
          --background-hover-color: ${this.hoverBackgroundColor()};
        `,
      );
    }
  }
}
