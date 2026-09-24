import { Page } from '@playwright/test';

declare global {
  interface Window {
    /** Recorder used by {@link captureWhatsAppPopup} to capture attempted share URLs. */
    __whatsappOpenedUrls?: string[];
  }
}

/** A captured WhatsApp share attempt. */
export interface WhatsAppShareCapture {
  /** The full `whatsapp://send?text=…` URL the app tried to open. */
  whatsappUrl: string;
  /**
   * The decoded `text=` payload of {@link WhatsAppShareCapture.whatsappUrl} —
   * for the designation share this **is** the shared `/work/{id}` URL; for the
   * invite share it is the message text with the `sign-in/{id}` link appended.
   */
  text: string;
  /**
   * The first `http(s)` URL found inside {@link WhatsAppShareCapture.text} —
   * the shared `/work/{id}` or `sign-in/{id}` link, handy for id extraction.
   */
  sharedUrl: string;
}

/**
 * Installs (or resets) the `window.open` recorder used by
 * {@link captureWhatsAppPopup} and by negative share assertions (every URL
 * passed to `window.open` lands in `window.__whatsappOpenedUrls`).
 */
export async function recordWindowOpen(page: Page): Promise<void> {
  await page.addInitScript(installWhatsAppRecorder);
  await page.evaluate(installWhatsAppRecorder);
}

/** All URLs passed to `window.open` since the recorder was last (re)installed. */
export async function recordedOpenUrls(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__whatsappOpenedUrls ?? []);
}

/**
 * Captures a `whatsapp://send?text=…` share by recording the URL passed to
 * `window.open` (UC-ASSIGN-19; see `docs/testability-gaps.md` §2.3).
 *
 * Custom-protocol caveat: `whatsapp://` has no registered handler in headless
 * Chromium, so it does not produce a reliable Playwright `popup` event. The
 * recorder is installed in the current document and on future navigations, then
 * the helper waits for the desktop UA path to call `window.open`.
 *
 * ```ts
 * const { whatsappUrl, sharedUrl } = await captureWhatsAppPopup(page, () =>
 *   page.getByTitle('Enviar Designação').click(),
 * );
 * expect(whatsappUrl).toContain('whatsapp://send?text=');
 * expect(sharedUrl).toContain('/work/');
 * ```
 */
export async function captureWhatsAppPopup(page: Page, trigger: () => Promise<void>): Promise<WhatsAppShareCapture> {
  await recordWindowOpen(page);
  await trigger();

  await page.waitForFunction(() =>
    (window.__whatsappOpenedUrls ?? []).some((url) => url.startsWith('whatsapp://send?text=')),
  );

  const whatsappUrl = await page.evaluate(() => {
    const urls = (window.__whatsappOpenedUrls ?? []).filter((url) => url.startsWith('whatsapp://send?text='));
    return urls[urls.length - 1] ?? '';
  });
  // `whatsapp://send?text=…` parses fine with the URL API (host `send`); the
  // app percent-encodes almost nothing, but `searchParams.get` decodes what
  // little is encoded (e.g. the invite message's `%0a` newlines).
  const text = new URL(whatsappUrl).searchParams.get('text') ?? '';
  const sharedUrl = text.match(/https?:\/\/\S+/)?.[0] ?? '';

  return { whatsappUrl, text, sharedUrl };
}

function installWhatsAppRecorder(): void {
  window.__whatsappOpenedUrls = [];
  window.open = (url?: string | URL) => {
    window.__whatsappOpenedUrls?.push(String(url));
    return null;
  };
}
