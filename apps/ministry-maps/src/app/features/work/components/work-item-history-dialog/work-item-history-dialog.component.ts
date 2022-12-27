import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

import { grey400 } from '@kingdom-apps/common-ui';

import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';

@Component({
  selector: 'kingdom-apps-work-item-history-dialog',
  styleUrls: ['./work-item-history-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-dialog title="Histórico de Visitas">
      <div class="work-item-history" *ngFor="let history of data">
        <div class="work-item-history__header">
          <lib-icon
            class="work-item-history__icon"
            [icon]="history.visitOutcome | visitOutcomeToIcon"
            [fillColor]="iconColor"></lib-icon>
          <h3 class="t-headline4 font-light">{{ history.date | date }}</h3>
        </div>
        <p class="work-item-history__note" *ngIf="history.notes">
          {{ history.notes }}
        </p>
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
export class WorkItemHistoryDialogComponent {
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
