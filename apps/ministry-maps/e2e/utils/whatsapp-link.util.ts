import { Page } from '@playwright/test';

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
 * Captures a `whatsapp://send?text=…` share by wrapping
 * `page.waitForEvent('popup')` around the action that triggers
 * `window.open('whatsapp://…')` (UC-ASSIGN-19; see `docs/testability-gaps.md`
 * §2.3).
 *
 * Custom-protocol caveat: `whatsapp://` has no registered handler in headless
 * Chromium, so the browser surfaces a `popup` event carrying the attempted URL
 * but performs no real navigation — reading `popup.url()` is the whole point;
 * do not wait for the popup to load. This works for the **desktop UA** path
 * (`window.open`); the mobile UA path navigates the same tab instead
 * (`window.location.href = …`) and must be intercepted differently.
 *
 * ```ts
 * const { whatsappUrl, sharedUrl } = await captureWhatsAppPopup(page, () =>
 *   page.getByTitle('Enviar Designação').click(),
 * );
 * expect(whatsappUrl).toContain('whatsapp://send?text=');
 * expect(sharedUrl).toContain('/work/');
 * ```
 */
export async function captureWhatsAppPopup(
  page: Page,
  trigger: () => Promise<void>,
): Promise<WhatsAppShareCapture> {
  const [popup] = await Promise.all([page.waitForEvent('popup'), trigger()]);

  const whatsappUrl = popup.url();
  // `whatsapp://send?text=…` parses fine with the URL API (host `send`); the
  // app percent-encodes almost nothing, but `searchParams.get` decodes what
  // little is encoded (e.g. the invite message's `%0a` newlines).
  const text = new URL(whatsappUrl).searchParams.get('text') ?? '';
  const sharedUrl = text.match(/https?:\/\/\S+/)?.[0] ?? '';

  return { whatsappUrl, text, sharedUrl };
}
