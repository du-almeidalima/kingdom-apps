import mapTerritoryIcon, { isIconLarge } from './territory-icon-mapper';
import { TerritoryIcon } from '../../../models/territory';

describe('mapTerritoryIcon', () => {
  it.each([
    [TerritoryIcon.MAN, 'generation-3'],
    [TerritoryIcon.WOMAN, 'generation-12'],
    [TerritoryIcon.COUPLE, 'generation-couple'],
    [TerritoryIcon.CHILD, 'generation-7'],
    // OTHER intentionally falls through to the default (man icon)
    [TerritoryIcon.OTHER, 'generation-3'],
    // unknown values also fall back to the default (man icon)
    ['unknown-icon' as TerritoryIcon, 'generation-3'],
  ])('maps %p to %p', (icon, expected) => {
    expect(mapTerritoryIcon(icon)).toBe(expected);
  });
});

describe('isIconLarge', () => {
  it.each([
    ['generation-couple', true],
    ['generation-3', false],
    ['generation-7', false],
    ['generation-12', false],
  ])('returns %p for %p', (icon, expected) => {
    expect(isIconLarge(icon as Parameters<typeof isIconLarge>[0])).toBe(expected);
  });
});
