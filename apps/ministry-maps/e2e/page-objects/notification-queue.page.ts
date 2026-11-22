import { Locator, Page } from '@playwright/test';

/** The login notification queue: the non-dismissible modal a signed-in User sees on session start. */
export class NotificationQueuePage {
  readonly sheet: Locator;
  readonly title: Locator;
  readonly counter: Locator;
  readonly sentinel: Locator;
  readonly acknowledge: Locator;

  constructor(page: Page) {
    this.sheet = page.getByTestId('notification-queue');
    this.title = page.getByTestId('notification-dialog-title');
    this.counter = page.getByTestId('notification-dialog-counter');
    this.sentinel = page.getByTestId('notification-dialog-sentinel');
    this.acknowledge = page.getByTestId('notification-dialog-action');
  }

  async scrollToBottom(): Promise<void> {
    await this.sentinel.scrollIntoViewIfNeeded();
  }
}
