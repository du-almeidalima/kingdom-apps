import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, inject } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'select[lib-select]',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
})
export class SelectComponent implements OnInit {
  private readonly renderer = inject(Renderer2);
  private readonly elRef = inject<ElementRef<HTMLSelectElement>>(ElementRef);

  ngOnInit(): void {
    this.renderer.addClass(this.elRef.nativeElement, `select`);
  }
}
