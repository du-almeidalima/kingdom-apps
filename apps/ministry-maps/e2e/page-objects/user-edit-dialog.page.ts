import { Locator, Page } from '@playwright/test';

/**
 * Page object for the user-edit dialog (`user-edit-dialog`).
 *
 * Fields exposed via testids: `user-edit-dialog`, `user-edit-name-input`,
 * `user-edit-save`, and `user-edit-role-title`.
 * The `Superintendente` option is conditionally rendered via `@if (canEditAdminRoles)`
 * (only for an `APP_ADMIN` editor).
 */
export class UserEditDialogPage {
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByTestId('user-edit-dialog');
    this.nameInput = this.dialog.getByTestId('user-edit-name-input');
    this.saveButton = this.dialog.getByTestId('user-edit-save');
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancelar' });
  }

  /** Visible texts of every rendered role radio title. */
  async roleRadioLabels(): Promise<string[]> {
    return this.dialog.getByTestId('user-edit-role-title').allTextContents();
  }

  /** Locator for the `kingdom-apps-icon-radio` whose title text matches `label`. */
  roleRadio(label: string): Locator {
    return this.dialog.locator('kingdom-apps-icon-radio').filter({
      has: this.page.getByTestId('user-edit-role-title').filter({ hasText: new RegExp(`^${label}$`) }),
    });
  }

  /** Click the role radio whose label text contains `label`. */
  async selectRole(label: string): Promise<void> {
    await this.roleRadio(label).click();
  }

  /** Click the `Salvar` submit button. */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /** Click the `Cancelar` button. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
