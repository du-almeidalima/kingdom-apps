import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { Icons } from '../icon/icon-type';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'lib-note',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './note.component.scss',
  template: `
    <div class="note" [ngClass]="typeClass()">
      <!-- Icon -->
      <lib-icon class="note__icon" [icon]="typeIcon()" fillColor="currentColor" />
      <!-- Message -->
      <p class="note__message">{{ message() }}</p>
    </div>
  `,
})
export class NoteComponent {
  private readonly iconTypes: Record<NotificationType, Icons> = {
    info: 'info-lined',
    success: 'check-mark-circle-thin',
    warning: 'warning-lined',
    error: 'error-8',
  };

  type = input.required<NotificationType>();
  message = input.required<string>();
  typeClass = computed(() => `note--${this.type()}`);
  typeIcon = computed(() => this.iconTypes[this.type()]);
}
