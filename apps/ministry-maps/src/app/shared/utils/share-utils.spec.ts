import { createSendWhatsAppLink, shareDesignationLink } from './share-utils';
import { isMobileDevice } from './user-agent';

jest.mock('./user-agent', () => ({ ...jest.requireActual('./user-agent'), isMobileDevice: jest.fn() }));

describe('createSendWhatsAppLink', () => {
  it('prefixes the text with the whatsapp scheme', () => {
    expect(createSendWhatsAppLink('hello')).toBe('whatsapp://send?text=hello');
  });

  it.each([
    ['spaces', 'hello world'],
    ['ampersand', 'a & b'],
    ['hash', 'a #fragment'],
    ['percent', '100%'],
    ['pt-BR accents', 'Olá, irmão! Acesse o link.'],
    ['newlines', 'line1\n\nline2'],
    ['full URL', 'https://example.com/work/DESIGNATION-1'],
  ])('URL-encodes text with %s', (_desc, text) => {
    expect(createSendWhatsAppLink(text)).toBe(`whatsapp://send?text=${encodeURIComponent(text)}`);
  });
});

describe('shareDesignationLink', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens WhatsApp in a desktop browser', () => {
    (isMobileDevice as jest.Mock).mockReturnValue(false);
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    shareDesignationLink('D1');
    expect(open).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send?text='));
    expect(new URL(open.mock.calls[0][0] as string).searchParams.get('text')).toBe(`${location.origin}/work/D1`);
  });

  it('navigates to WhatsApp in a mobile browser', () => {
    (isMobileDevice as jest.Mock).mockReturnValue(true);
    const mobileWindow = { location: { origin: 'https://example.test', href: '' }, open: jest.fn() } as unknown as Window;
    shareDesignationLink('D2', mobileWindow);
    expect(mobileWindow.location.href).toContain('https%3A%2F%2Fexample.test%2Fwork%2FD2');
  });
});
