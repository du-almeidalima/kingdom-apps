import { getUserInitials } from './user-utils';

describe('getUserInitials', () => {
  it.each([
    ['two names gives first letter of each', 'John Doe', 'JD'],
    ['only the first two names are used', 'Jane Mary Doe', 'JM'],
    ['single name gives its first two letters', 'John', 'Jo'],
    ['two-letter name is kept whole', 'Jo', 'Jo'],
    ['one-letter name is kept whole', 'J', 'J'],
    ['trailing whitespace is ignored', 'John ', 'Jo'],
    ['leading whitespace is ignored', ' John Doe ', 'JD'],
    ['multiple inner spaces are collapsed', 'John  Doe', 'JD'],
  ])('%s', (_desc, name, expected) => {
    expect(getUserInitials(name)).toBe(expected);
  });

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace-only', '   '],
  ])('returns XX for %s', (_desc, name) => {
    expect(getUserInitials(name)).toBe('XX');
  });
});
