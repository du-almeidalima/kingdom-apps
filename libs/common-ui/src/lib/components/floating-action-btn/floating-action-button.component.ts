import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';
import { white100 } from '../../../';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lib-floating-action-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./floating-action-button.component.scss'],
  template: ` <ng-content></ng-content> `,
})
export class FloatingActionButtonComponent implements OnInit {
  @Input()
  backgroundColor = white100;

  constructor(private readonly renderer: Renderer2, private readonly elRef: ElementRef<HTMLButtonElement>) { }

  ngOnInit() {
    this.renderer.addClass(this.elRef.nativeElement, `floating-action-btn`);
    this.renderer.setStyle(this.elRef.nativeElement, 'backgroundColor', this.backgroundColor,);
  }
}

