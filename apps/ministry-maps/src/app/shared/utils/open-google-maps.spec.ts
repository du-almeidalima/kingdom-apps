import openGoogleMapsHandler from './open-google-maps';
import { setUserAgent, spyWindowOpen, territoryMockBuilder } from '../../../test/mocks';

const territory = () =>
  territoryMockBuilder({
    id: 'TERRITORY-MAPS',
    address: '123 Main St',
    city: 'Springfield',
    mapsLink: 'https://maps.app.goo.gl/abc123',
  });

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SAMSUNG_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36';
const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';
const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';

describe('openGoogleMapsHandler', () => {
  let restoreUserAgent: () => void = () => undefined;
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    windowOpenSpy = spyWindowOpen();
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    restoreUserAgent();
  });

  it.each([
    ['Chrome', CHROME_UA, '_self'],
    ['Firefox', FIREFOX_UA, '_blank'],
    ['Safari', SAFARI_UA, '_blank'],
  ])('opens the maps link in a %s tab (%s)', (_desc, ua, target) => {
    restoreUserAgent = setUserAgent(ua);

    openGoogleMapsHandler('https://maps.app.goo.gl/abc123', territory());

    expect(windowOpenSpy).toHaveBeenCalledWith('https://maps.app.goo.gl/abc123', target);
  });

  it('extracts the URL when the link contains surrounding text', () => {
    restoreUserAgent = setUserAgent(CHROME_UA);

    openGoogleMapsHandler('Check this: https://maps.app.goo.gl/abc123 thanks!', territory());

    expect(windowOpenSpy).toHaveBeenCalledWith('https://maps.app.goo.gl/abc123', '_self');
  });

  it('falls back to the raw string when no URL is found in the text', () => {
    restoreUserAgent = setUserAgent(FIREFOX_UA);

    openGoogleMapsHandler('not a url', territory());

    expect(windowOpenSpy).toHaveBeenCalledWith('not a url', '_blank');
  });

  it('builds an intent:// URL with the maps package and fallback on Samsung browsers', () => {
    restoreUserAgent = setUserAgent(SAMSUNG_UA);

    openGoogleMapsHandler('https://maps.app.goo.gl/abc123', territory());

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    const [intentUrl] = windowOpenSpy.mock.calls[0];
    expect(intentUrl).toMatch(/^intent:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    expect(intentUrl).toContain('query=123+Main+St%2C+Springfield');
    expect(intentUrl).toContain('package=com.google.android.apps.maps');
    expect(intentUrl).toContain('S.browser_fallback_url=https://maps.app.goo.gl/abc123%3Fentry%3Ds');
    expect(intentUrl).toContain('S.intent_description=123 Main St');
    expect(intentUrl.endsWith(';end') || intentUrl.endsWith(';end')).toBe(true);
  });
});
