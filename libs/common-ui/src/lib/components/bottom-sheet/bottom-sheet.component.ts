import { DialogRef } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { IconComponent } from '../icon/icon.component';

/**
 * Slide-up sheet for CDK Dialog. Put a `lib-dialog-footer` in the content to pin it below the
 * scrollable body. `reachedBottom` latches to true once the sentinel at the end of the content
 * has been in view, so consumers can gate primary footer actions on it.
 */
@Component({
  selector: 'lib-bottom-sheet',
  styleUrls: ['./bottom-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bottom-sheet" data-testid="bottom-sheet">
      <header class="bottom-sheet__header">
        <h2 class="bottom-sheet__title t-headline3">{{ title() }}</h2>
        @if (closable()) {
          <button
            lib-icon-button
            type="button"
            data-testid="bottom-sheet-close"
            aria-label="Fechar"
            (click)="dialogRef.close()"
          >
            <lib-icon icon="x-mark-lined"></lib-icon>
          </button>
        }
      </header>
      <div class="bottom-sheet__body">
        <div #content class="bottom-sheet__content" data-testid="bottom-sheet-content">
          <ng-content></ng-content>
          <div #sentinel class="bottom-sheet__sentinel"></div>
        </div>
        @if (!reachedBottom()) {
          <button
            type="button"
            class="bottom-sheet__scroll-hint t-caption"
            data-testid="bottom-sheet-scroll-hint"
            (click)="scrollToBottom()"
          >
            Role para ler tudo
          </button>
        }
      </div>
      <div class="bottom-sheet__footer">
        <ng-content select="lib-dialog-footer"></ng-content>
      </div>
    </section>
  `,
  imports: [IconButtonComponent, IconComponent],
})
export class BottomSheetComponent implements AfterViewInit, OnDestroy {
  protected readonly dialogRef = inject(DialogRef);

  title = input('');
  /** When false the header close button is hidden; Escape and backdrop stay governed by `disableClose`. */
  closable = input(true);

  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');
  private readonly reachedBottomState = signal(false);
  readonly reachedBottom = this.reachedBottomState.asReadonly();
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.reachedBottomState.set(true);
        }
      },
      { root: this.content().nativeElement },
    );
    this.observer.observe(this.sentinel().nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  protected scrollToBottom(): void {
    const element = this.content().nativeElement;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }
}
