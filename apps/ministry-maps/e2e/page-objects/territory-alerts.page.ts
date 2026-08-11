import { Locator, Page } from '@playwright/test';

/**
 * Page object for the territory alert-resolution dialogs.
 *
 * Both the "Morador Mudou" move dialog (`territory-move-alert-dialog`) and the
 * generic revisit / stop-visiting dialog (`territory-generic-alert-dialog`)
 * share the `alert-resolve-dialog` testid and an `alert-resolve-save` button.
 * The move dialog additionally exposes `alert-resolve-radio` controls. Since
 * the radios/labels render inside `kingdom-apps-icon-radio` elements, they are
 * targeted by their visible text (e.g. `Remover Marcação`, `Apagar Endereço`).
 */
export class TerritoryAlertsPage {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByTestId('alert-resolve-dialog');
    this.title = this.dialog.locator('[class*="dialog__title"], h2').first();
    this.saveButton = page.getByTestId('alert-resolve-save');
  }

  /** Click the radio whose `kingdom-apps-icon-radio` label contains `label`. */
  async selectOption(label: string): Promise<void> {
    await this.dialog.getByTestId('alert-resolve-radio').filter({ hasText: label }).click();
  }

  /** Click the save/submit button (label `Salvar` on move, `Remover Marcação` on generic). */
  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
