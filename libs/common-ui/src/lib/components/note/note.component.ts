import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { Icons } from '../icon/icon-type';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'lib-note',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './note.component.scss',
  template: `
    <div class="w-full flex items-center gap-3 p-4 border border-solid" [ngClass]="typeClasses()">
      <!-- Icon -->
      <lib-icon class="w-28 h-16" [icon]="typeIcon()" [fillColor]="typeColor()" />
      <!-- Message -->
      <p class="t-body2" [ngClass]="textClasses()">{{ message() }}</p>
    </div>
  `,
})
export class NoteComponent {
  private readonly tailwindTypeClasses: Record<NotificationType, string> = {
    info: 'bg-blue-50 border-blue-800',
    success: 'bg-green-50 border-green-800',
    warning: 'bg-yellow-50 border-yellow-800',
    error: 'bg-red-50 border-red-800',
  };

  private readonly iconTypes: Record<NotificationType, Icons> = {
    info: 'info-lined',
    success: 'check-mark-circle-thin',
    warning: 'warning-lined',
    error: 'error-8',
  };

  private readonly iconColors: Record<NotificationType, string> = {
    info: '#00598AFF',
    success: '#00A63E',
    warning: '#E17100',
    error: '#C10007',
  };

  private readonly textColorClasses: Record<NotificationType, string> = {
    info: 'text-blue-950',
    success: 'text-green-950',
    warning: 'text-amber-950',
    error: 'text-red-950',
  };

  type = input.required<NotificationType>();
  message = input.required<string>();
  typeClasses = computed(() => this.tailwindTypeClasses[this.type()]);
  typeIcon = computed(() => this.iconTypes[this.type()]);
  typeColor = computed(() => this.iconColors[this.type()]);
  textClasses = computed(() => this.textColorClasses[this.type()]);
}
