import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, inject } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'input[lib-input], textarea[lib-input]',
  template: ``,
  styleUrls: ['./input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements OnInit {
  private readonly renderer = inject(Renderer2);
  private readonly elRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  ngOnInit(): void {
    this.renderer.addClass(this.elRef.nativeElement, `input`);
  }
}
