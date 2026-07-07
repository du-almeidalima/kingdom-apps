import { coordsFromResolvedUrl, cleanAddressFromUrl, cepFromText, isInRegion } from './geocode-parse';

describe('geocode-parse', () => {
  it('extracts @lat,lng and !3d!4d coords', () => {
    expect(coordsFromResolvedUrl('https://www.google.com/maps/@-22.71364,-47.36594,17z')).toEqual({ lat: -22.71364, lng: -47.36594 });
    expect(coordsFromResolvedUrl('x!3d-22.78799!4d-47.28769z')).toEqual({ lat: -22.78799, lng: -47.28769 });
    expect(coordsFromResolvedUrl('https://maps.app.goo.gl/abc')).toBeNull();
  });
  it('double-decodes the /place/ address', () => {
    const u = 'https://www.google.com/maps/place/R.%2BJ%25C3%25BAlio%2BMarmile,%2B728%2B-%2BJardim%2B%25C3%2589den,%2BNova%2BOdessa%2B-%2BSP,%2B13460-000/data%3D!4m2';
    expect(cleanAddressFromUrl(u)).toContain('Júlio Marmile, 728');
    expect(cleanAddressFromUrl(u)).toContain('13460-000');
  });
  it('finds CEP and rejects the viewport-center constant', () => {
    expect(cepFromText('Nova Odessa - SP, 13460-000')).toBe('13460-000');
    expect(isInRegion({ lat: -22.742162, lng: -47.284224 })).toBe(false); // constant
    expect(isInRegion({ lat: -22.71364, lng: -47.36594 })).toBe(true);
    expect(isInRegion({ lat: -23.5, lng: -46.6 })).toBe(false); // São Paulo city, out of bbox
  });
});
