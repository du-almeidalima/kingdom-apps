import { ChangeDetectionStrategy, Component, EventEmitter, inject, input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'lib-copy-text-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  standalone: true,
  styleUrl: './copy-text-block.component.scss',
  template: `
    <!-- LINK CONTAINER -->
    <div class="invite-link-to-copy">
      <button (click)="handleCopyClick()">Copy</button>
      <span>{{ text() }}</span>
    </div>
    <p class="t-body2"></p>
  `,
})
export class CopyTextBlockComponent {
  clipboard = inject(Clipboard);

  text = input.required<string>();
  helpText = input<string>();

  //TODO: Transform this to output() on new Angular version
  @Output() copyClick = new EventEmitter<string>();

  handleCopyClick() {
    const hasCopied = this.clipboard.copy(this.text());

    if (hasCopied) {
      this.copyClick.emit(this.text());
    }
  }
}
