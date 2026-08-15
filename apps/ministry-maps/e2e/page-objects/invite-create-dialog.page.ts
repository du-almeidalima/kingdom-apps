import { Locator, Page } from '@playwright/test';

/**
 * Page object for the invite-create dialog (`invite-create-dialog`).
 *
 * Creation view exposes testids: `invite-email-input` (Email opcional) and `Criar Link` submit button.
 * Roles are `kingdom-apps-icon-radio` elements (`Publicador`, `Organizador`, `Ancião`).
 *
 * Copy-link view exposes testids: `copy-text-block-content`, `copy-text-block-button`,
 * `invite-send-button`, and `invite-close-button`.
 */
export class InviteCreateDialogPage {
  readonly dialog: Locator;
  readonly emailInput: Locator;
  readonly createButton: Locator;

  // Copy-link view locators
  readonly copyLinkText: Locator;
  readonly copyButton: Locator;
  readonly sendButton: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByTestId('invite-create-dialog');
    this.emailInput = this.dialog.getByTestId('invite-email-input');
    this.createButton = this.dialog.getByRole('button', { name: 'Criar Link' });

    this.copyLinkText = this.dialog.getByTestId('copy-text-block-content');
    this.copyButton = this.dialog.getByTestId('copy-text-block-button');
    this.sendButton = this.dialog.getByTestId('invite-send-button');
    this.closeButton = this.dialog.getByTestId('invite-close-button');
  }

  /** Locator for a role radio option by visible title text (`Publicador`, `Organizador`, `Ancião`). */
  roleRadio(label: string): Locator {
    return this.dialog.locator('kingdom-apps-icon-radio').filter({ hasText: label });
  }

  /** Select a role option in the invite creation view. */
  async selectRole(label: string): Promise<void> {
    await this.roleRadio(label).click();
  }

  /** Click `Criar Link` to submit. */
  async submit(): Promise<void> {
    await this.createButton.click();
  }
}
