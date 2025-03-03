import { Component, Input } from '@angular/core';
import { white100 } from '../../../';
import { RouterLink } from '@angular/router';
import { NgStyle, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'lib-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [RouterLink, NgTemplateOutlet, NgStyle],
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
