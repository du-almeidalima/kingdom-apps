import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

// TODO: This can be a generic dialog confirmation component
@Component({
  selector: 'kingdom-apps-territory-delete-dialog',
  styleUrls: ['./territory-delete-dialog.component.scss'],
  template: ` <lib-dialog title="Excluir Território">
    <p class='t-body1'>Você realmente deseja excluir este território?</p>
    <p class='t-body1 mt-5'>Essa ação não poderá ser desfeita</p>
    <lib-dialog-footer>
      <div class="flex justify-end gap-4">
        <button lib-button (click)="handleCancel(false)">Cancelar</button>
        <button lib-button btnType="primary" (click)="handleCancel(true)">Confirmar</button>
      </div>
    </lib-dialog-footer>
  </lib-dialog>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryDeleteDialogComponent {
  constructor(private readonly dialogRef: DialogRef) {}

  // TODO: Refactor the basic dialog logic into a base class
  handleCancel(result: boolean) {
    this.dialogRef.close(result);
  }
}
