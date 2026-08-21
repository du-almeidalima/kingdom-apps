import { BrowserEnum, getAgentBrowser, isMobileDevice } from './user-agent';
import { setUserAgent } from '../../../test/mocks';

describe('user-agent', () => {
  let restoreUserAgent: () => void;

  beforeEach(() => {
    restoreUserAgent = setUserAgent('');
  });

  afterEach(() => {
    restoreUserAgent();
  });

  describe('getAgentBrowser', () => {
    it.each([
      [
        'desktop Chrome',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        BrowserEnum.CHROME,
      ],
      [
        'iOS Chrome (CriOS must not be detected as Safari)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
        BrowserEnum.CHROME,
      ],
      [
        // Samsung Internet UAs contain "Chrome" too: Samsung must win through matching order.
        'Samsung Internet',
        'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
        BrowserEnum.SAMSUNG,
      ],
      [
        'desktop Firefox',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        BrowserEnum.FIREFOX,
      ],
      [
        // FxiOS UAs match the Safari branch first (iPhone + WebKit + no CriOS) — pinned as current behavior.
        'iOS Firefox is detected as Safari (known quirk)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15',
        BrowserEnum.SAFARI,
      ],
      [
        // Desktop Safari UAs lack iPad|iPhone|iPod, so they fall through to UNKNOWN.
        // For maps-link dispatch this is still correct (opens _blank). Pinned as current behavior.
        'desktop Safari is NOT detected as Safari (known quirk)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        BrowserEnum.UNKNOWN,
      ],
      [
        'iPhone Safari',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        BrowserEnum.SAFARI,
      ],
      ['non-browser agent', 'curl/8.4.0', BrowserEnum.UNKNOWN],
      ['empty agent', '', BrowserEnum.UNKNOWN],
    ])('%s', (_desc, ua, expected) => {
      restoreUserAgent();
      restoreUserAgent = setUserAgent(ua);

      expect(getAgentBrowser()).toBe(expected);
    });
  });

  describe('isMobileDevice', () => {
    it.each([
      ['Android Chrome', 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', true],
      ['iPhone Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', true],
      ['iPad Safari', 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1', true],
      ['desktop Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', false],
      ['desktop macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', false],
    ])('%s', (_desc, ua, expected) => {
      restoreUserAgent();
      restoreUserAgent = setUserAgent(ua);

      expect(isMobileDevice()).toBe(expected);
    });
  });
});
