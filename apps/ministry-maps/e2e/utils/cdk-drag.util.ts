import { Locator, Page } from '@playwright/test';

/** Intermediate mouse moves per drag — CDK needs several to recognize a real drag gesture. */
const DRAG_STEPS = 5;

/**
 * Drags `source` onto `target` with the low-level mouse API — the only way to
 * drive Angular CDK drag-drop (`cdkDropList`/`cdkDrag`) from Playwright, used
 * by `/territories` manual reorder (UC-TERR-21; see `docs/testability-gaps.md`
 * §2.6). `locator.dragTo()` and synthetic HTML5 drag events do **not** work:
 * CDK listens for pointer events with intermediate moves, so this helper
 * hovers the handle, presses the button, moves in explicit steps, and only
 * then releases.
 *
 * The drop itself triggers the app's `batchUpdate` of `positionIndex` — a
 * Firestore transaction — so callers must synchronize the persistence
 * assertion with `expect.poll`/`toPass` rather than assuming it has landed.
 */
export async function dragRowByMouse(page: Page, source: Locator, target: Locator): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error(`dragRowByMouse: ${!sourceBox ? 'source' : 'target'} has no bounding box (not visible?).`);
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await source.hover();
  await page.mouse.down();

  // Explicit intermediate moves (never a single jump) so the CDK drag
  // threshold and preview engage.
  for (let step = 1; step <= DRAG_STEPS; step++) {
    await page.mouse.move(
      startX + ((endX - startX) * step) / DRAG_STEPS,
      startY + ((endY - startY) * step) / DRAG_STEPS,
    );
  }

  await page.mouse.up();
}
