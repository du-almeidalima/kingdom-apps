import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class HeaderComponent {
  @Input()
  public backgroundColorVar = 'hsl(0, 0%, 50%)';
  @Input()
  public logoBackgroundColor = 'hsl(0, 0%, 50%)';

  @Input()
  public initials = 'TT';
}
