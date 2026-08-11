import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the `/users` route.
 *
 * Each row is a `kingdom-apps-user-list-item` component exposing three testids:
 * `user-list-item` (root), `user-item-initials` (figure), `user-item-role-badge`
 * (role span). The overflow `⋮` trigger carries `user-item-menu` and is gated
 * by `*libAuthorize` (only `APP_ADMIN`/`SUPERINTENDENT`/`ADMIN` see it). The
 * invite FAB carries no testid — it's targeted via its `title` attribute.
 *
 * `goto()` waits for the list container; further synchronization (e.g. waiting
 * for a specific row count) belongs to the caller's web-first assertions.
 */
export class UsersPage {
  readonly heading: Locator;
  readonly list: Locator;
  readonly userItems: Locator;
  readonly inviteFab: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('users-heading');
    this.list = page.getByTestId('users-list');
    this.userItems = page.getByTestId('user-list-item');
    this.inviteFab = page.getByTitle('Criar Link de Convite');
  }

  /** Navigate to the users page and wait for the list container to render. */
  async goto(): Promise<void> {
    await this.page.goto('/users');
    await expect(this.list).toBeVisible();
  }

  /** Locator for the row whose content contains `name`. */
  rowByName(name: string): Locator {
    return this.userItems.filter({ hasText: name });
  }

  /** The initials figure inside the row for `name`. */
  initials(name: string): Locator {
    return this.rowByName(name).getByTestId('user-item-initials');
  }

  /** The translated-role badge inside the row for `name`. */
  roleBadge(name: string): Locator {
    return this.rowByName(name).getByTestId('user-item-role-badge');
  }

  /** The `⋮` overflow menu trigger inside the row for `name` (absent under role gating). */
  menuTrigger(name: string): Locator {
    return this.rowByName(name).getByTestId('user-item-menu');
  }

  /** Current rendered user-row count. */
  async rowCount(): Promise<number> {
    return this.userItems.count();
  }

  /** Open the `⋮` overflow menu on the row whose content contains `name`. */
  async openItemMenu(name: string): Promise<void> {
    await this.menuTrigger(name).click();
  }

  /** Locator for an item in the currently open CDK menu (by visible text, e.g. `Editar`, `Apagar`). */
  menuItem(text: string): Locator {
    return this.page.locator('.menu__item').filter({ hasText: text });
  }
}
