import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ButtonComponent, DialogComponent, DialogFooterComponent, IconComponent } from '@kingdom-apps/common-ui';

import { VisitOutcomeToIconPipe } from '../../../pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';
import { DatePipe, SlicePipe } from '@angular/common';

@Component({
  selector: 'kingdom-apps-history-dialog',
  styleUrls: ['./history-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-dialog title="Histórico de Visitas" data-testid="history-dialog">
      @for (history of data; track history.id) {
        <div class="work-item-history" data-testid="history-dialog-row">
          <div class="work-item-history__header">
            <lib-icon
              class="work-item-history__icon"
              [icon]="history.visitOutcome | visitOutcomeToIcon"
              [fillColor]="iconColor"
            ></lib-icon>
            <p class="work-item-history__note">
              {{ history.notes ? history.notes : 'Sem observações' }}
            </p>
          </div>
          <div class="work-item-history__footer">
            @if (history.isRevisit) {
              <span
                class="territory-alert-badge territory-alert-badge--revisit"
                title="Essa pessoa foi marcada como revisita recentemente"
              >
                Revisita
              </span>
            }
            <h3 class="t-caption font-light text-right ml-auto">
              @if (history.name) {
                <span>{{ history.name | slice: 0 : 30 }}</span
                >,&nbsp;
              }
              {{ history.date | date }}
            </h3>
          </div>
        </div>
      }
      <lib-dialog-footer class="sticky bottom-0 left-0 right-0">
        <div class="flex justify-end gap-4">
          <button
            lib-button
            btnType="primary"
            type="submit"
            form="work-item-complete"
            data-testid="history-dialog-close"
            (click)="handleCancel()"
          >
            Fechar
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
  imports: [
    VisitOutcomeToIconPipe,
    IconComponent,
    DialogComponent,
    DialogFooterComponent,
    DatePipe,
    SlicePipe,
    ButtonComponent,
  ],
})
export class HistoryDialogComponent {
  private readonly dialogRef = inject(DialogRef);
  readonly data = inject(DIALOG_DATA);

  public iconColor = 'currentColor';

  // TODO: Refactor the basic dialog logic into a base class
  handleCancel() {
    this.dialogRef.close();
  }
}
