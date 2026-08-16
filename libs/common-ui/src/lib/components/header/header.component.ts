import { Component, Input } from '@angular/core';
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
  public backgroundColorVar = 'var(--kui-color-surface-inverse, hsl(0, 0%, 50%))';

  @Input()
  public logoBackgroundColor = 'var(--kui-color-surface-inverse, hsl(0, 0%, 50%))';

  @Input()
  public logoColor? = 'var(--kui-color-on-inverse, currentColor)';

  @Input()
  public initials = 'TT';

  @Input()
  public headerLink?: string;
}
