import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2 } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'input[lib-input], textarea[lib-input]',
  template: ``,
  styleUrls: ['./input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements OnInit {
  constructor(private readonly renderer: Renderer2, private readonly elRef: ElementRef<HTMLInputElement>) {}

  ngOnInit(): void {
    this.renderer.addClass(this.elRef.nativeElement, `input`);
  }
}
