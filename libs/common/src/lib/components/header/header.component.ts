import { Component, Input } from '@angular/core';
import { white100 } from '../../../';

@Component({
  selector: 'lib-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input()
  public backgroundColorVar = 'hsl(0, 0%, 50%)';

  @Input()
  public logoBackgroundColor = 'hsl(0, 0%, 50%)';

  @Input()
  public logoColor? = white100;

  @Input()
  public initials = 'TT';

  @Input()
  public headerLink?: string;
}
