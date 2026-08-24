import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, inject } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'label[lib-label],span[lib-label]',
  template: `<ng-content></ng-content>`,
  styleUrls: ['./label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelComponent implements OnInit {
  private readonly renderer = inject(Renderer2);
  private readonly elRef = inject<ElementRef<HTMLLabelElement>>(ElementRef);

  ngOnInit(): void {
    this.renderer.addClass(this.elRef.nativeElement, `label`);
  }
}
