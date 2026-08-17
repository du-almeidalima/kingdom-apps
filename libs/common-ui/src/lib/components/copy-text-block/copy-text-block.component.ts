import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  input,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';

import { Clipboard } from '@angular/cdk/clipboard';
import { IconComponent } from '../icon/icon.component';
import { green300, grey400 } from '../../styles/abstract/variables';

@Component({
  selector: 'lib-copy-text-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  standalone: true,
  styleUrl: './copy-text-block.component.scss',
  template: `
    <!-- LINK CONTAINER -->
    <div class="copy-text-block">
      <span class="copy-text-block__content" data-testid="copy-text-block-content">{{ text() }}</span>
      <button class="copy-text-block__button" data-testid="copy-text-block-button" (click)="handleCopyClick()">
        @if (isTextCopied()) {
        <lib-icon icon="check-mark-circle-lined" class="h-8 w-8" [fillColor]="'var(--kui-color-action-primary)'" />
        } @else {
        <lib-icon icon="copy-lined" class="h-8 w-8" [fillColor]="'currentColor'" />
        }
      </button>
    </div>
    @if (helpText()) {
    <p class="t-caption mt-2">{{ helpText() }}</p>
    }
  `,
})
export class CopyTextBlockComponent implements OnDestroy {

  clipboard = inject(Clipboard);

  text = input.required<string>();
  helpText = input<string>();

  isTextCopied = signal(false);
  timer: any;

  //TODO: Transform this to output() on new Angular version
  @Output() copyClick = new EventEmitter<string>();

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  handleCopyClick() {
    // Avoid spamming the copy button
    if (this.isTextCopied()) {
      return;
    }

    const hasCopied = this.clipboard.copy(this.text());

    if (hasCopied) {
      this.isTextCopied.set(true);
      this.copyClick.emit(this.text());

      this.timer = setTimeout(() => {
        this.isTextCopied.set(false);
      }, 2000);
    }
  }
}
