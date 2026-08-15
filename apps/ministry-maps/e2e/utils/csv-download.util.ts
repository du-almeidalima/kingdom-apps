import { readFile } from 'fs/promises';

import { Page } from '@playwright/test';

/** A captured CSV download. */
export interface CsvDownload {
  /** The browser-suggested filename (e.g. `mm-territorios-2024-01-15T10-00-00.csv`). */
  suggestedFilename: string;
  /**
   * The full file text. **BOM-aware on purpose:** the export prefixes the
   * content with the UTF-8 BOM (`'\uFEFF'`) so Excel reads the pt-BR
   * accents correctly, and asserting that prefix is part of UC-TERR-34 — this
   * helper deliberately does not strip it.
   */
  content: string;
}

/**
 * Captures the CSV download triggered by a UI action (UC-TERR-34, J-08; see
 * `docs/testability-gaps.md` §2.4) by wrapping `page.waitForEvent('download')`
 * around the trigger and reading the saved file back from `download.path()`.
 *
 * ```ts
 * const { suggestedFilename, content } = await downloadCsv(page, () =>
 *   page.getByText('Exportar Territórios').click(),
 * );
 * expect(suggestedFilename).toMatch(/^mm-territorios-.*\.csv$/);
 * expect(content.startsWith('\uFEFF')).toBe(true);
 * ```
 */
export async function downloadCsv(
  page: Page,
  trigger: () => Promise<void>,
): Promise<CsvDownload> {
  const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);

  const path = await download.path();
  if (!path) {
    throw new Error(
      'Download captured but no local path was available — downloads must not be cancelled in this context.',
    );
  }

  // utf-8 read keeps the leading '\uFEFF' as the first character of `content`.
  const content = await readFile(path, 'utf-8');

  return { suggestedFilename: download.suggestedFilename(), content };
}
