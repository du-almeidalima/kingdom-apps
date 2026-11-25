import { ChangeDetectionStrategy, Component, computed, inject, input, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';

/**
 * Renders Markdown as HTML sanitized by Angular's DomSanitizer.
 */
@Component({
  selector: 'lib-markdown',
  styleUrls: ['./markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="markdown" data-testid="markdown" [innerHTML]="html()"></div>`,
})
export class MarkdownComponent {
  private readonly sanitizer = inject(DomSanitizer);

  content = input.required<string>();

  protected readonly html = computed(
    () => this.sanitizer.sanitize(SecurityContext.HTML, marked.parse(this.content()) as string) ?? '',
  );
}
