import { Locator, Page } from '@playwright/test';

/**
 * Page object for the create/edit territory dialog (`territory-manage-dialog`).
 *
 * Wraps the `territory-*` testids added in WP-06. The address field has no
 * testid, so it is targeted by its stable `#territory-address` id. The dialog
 * title flips between `Adicionar Território` and `Editar Território`; specs
 * assert on `title` to distinguish create vs edit mode.
 */
export class TerritoryManageDialogPage {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly addressInput: Locator;
  readonly citySelect: Locator;
  readonly iconSelect: Locator;
  readonly peopleInput: Locator;
  readonly mapsLinkInput: Locator;
  readonly bibleStudentCheckbox: Locator;
  readonly instructorInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('territory-manage-dialog');
    this.title = this.dialog.locator('[class*="dialog__title"], h2').first();
    this.addressInput = this.dialog.locator('#territory-address');
    this.citySelect = this.dialog.getByTestId('territory-city-select');
    this.iconSelect = this.dialog.getByTestId('territory-icon-select');
    this.peopleInput = this.dialog.getByTestId('territory-people-input');
    this.mapsLinkInput = this.dialog.getByTestId('territory-maps-link-input');
    this.bibleStudentCheckbox = this.dialog.getByTestId('territory-bible-student-checkbox');
    this.instructorInput = this.dialog.getByTestId('territory-instructor-input');
    this.submitButton = this.dialog.getByTestId('territory-submit');
    this.cancelButton = this.dialog.getByTestId('territory-cancel');
  }

  /** Click the submit button (label is `Adicionar` or `Salvar`). */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Click the `Cancelar` button. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
