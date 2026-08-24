import { createSendWhatsAppLink } from './share-utils';

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
