import { Locator, Page } from '@playwright/test';

export class WorkItemCompleteDialogPage {
  readonly dialog: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly nameError: Locator;
  readonly revisitCheckbox: Locator;
  readonly nameInput: Locator;
  readonly notesTextarea: Locator;

  constructor(public readonly page: Page) {
    this.dialog = page.getByTestId('work-complete-dialog');
    this.submitButton = page.getByTestId('work-complete-submit');
    this.cancelButton = page.getByTestId('work-complete-cancel');
    this.nameError = page.getByTestId('work-complete-name-error');
    this.revisitCheckbox = page.locator('#revisit-checkbox');
    this.nameInput = page.locator('#publisher-name');
    this.notesTextarea = page.locator('#congregation-address');
  }

  async selectOutcome(label: string): Promise<void> {
    await this.dialog.locator('kingdom-apps-icon-radio').filter({ hasText: label }).click();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
