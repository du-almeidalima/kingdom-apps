import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

import { grey400 } from '@kingdom-apps/common-ui';

import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';

@Component({
  selector: 'kingdom-apps-history-dialog',
  styleUrls: ['./history-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-dialog title="Histórico de Visitas">
      <div class="work-item-history" *ngFor="let history of data">
        <div class="work-item-history__header">
          <lib-icon
            class="work-item-history__icon"
            [icon]="history.visitOutcome | visitOutcomeToIcon"
            [fillColor]="iconColor"></lib-icon>
          <p class="work-item-history__note">
            {{ history.notes ? history.notes : 'Sem observações' }}
          </p>
        </div>
        <div class="work-item-history__footer">
          @if (history.isRevisit) {
            <span
              class="territory-alert-badge territory-alert-badge--revisit"
              title="Essa pessoa foi marcada como revisita recentemente">
            Revisita
          </span>
          }
          <h3 class="t-caption font-light text-right ml-auto">{{ history.date | date }}</h3>
        </div>
      </div>
      <lib-dialog-footer class="sticky bottom-0 left-0 right-0">
        <div class="flex justify-end gap-4">
          <button lib-button btnType="primary" type="submit" form="work-item-complete" (click)="handleCancel()">
            Fechar
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class HistoryDialogComponent {
  public iconColor = grey400;

  constructor(
    private readonly dialogRef: DialogRef,
    @Inject(DIALOG_DATA) public readonly data: TerritoryVisitHistory[]
  ) {}

  // TODO: Refactor the basic dialog logic into a base class
  handleCancel() {
    this.dialogRef.close();
  }
}
