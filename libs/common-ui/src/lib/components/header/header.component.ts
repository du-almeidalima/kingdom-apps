import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgStyle, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'lib-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [RouterLink, NgTemplateOutlet, NgStyle],
})
export class HeaderComponent {
  public backgroundColorVar = input('var(--kui-color-surface-inverse, hsl(0, 0%, 50%))');

  public logoBackgroundColor = input('var(--kui-color-surface-inverse, hsl(0, 0%, 50%))');

  public logoColor = input('var(--kui-color-on-inverse, currentColor)');

  public initials = input('TT');

  public headerLink = input<string | undefined>(undefined);
}
