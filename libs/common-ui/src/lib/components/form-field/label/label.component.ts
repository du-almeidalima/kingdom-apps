import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2 } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'label[lib-label]',
  template: `<ng-content></ng-content>`,
  styleUrls: ['./label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelComponent implements OnInit {
  constructor(private readonly renderer: Renderer2, private readonly elRef: ElementRef<HTMLLabelElement>) {}

  ngOnInit(): void {
    this.renderer.addClass(this.elRef.nativeElement, `label`);
  }
}
