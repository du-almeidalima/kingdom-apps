import { differenceInMonths } from './date';

const d = (year: number, month: number, day: number) => new Date(year, month - 1, day);

describe('differenceInMonths', () => {
  it.each([
    ['same month', d(2024, 5, 10), d(2024, 5, 25), 0],
    ['one month apart, same year', d(2024, 5, 10), d(2024, 6, 1), 1],
    ['across year boundary', d(2023, 12, 15), d(2024, 1, 5), 1],
    ['exactly one year', d(2023, 6, 15), d(2024, 6, 15), 12],
    ['partial month counts as a whole month', d(2024, 8, 31), d(2024, 9, 1), 1],
    ['multiple years and months', d(2020, 1, 31), d(2024, 3, 1), 50],
  ])('%s', (_desc, firstDate, secondDate, expected) => {
    expect(differenceInMonths(firstDate, secondDate)).toBe(expected);
  });

  it('clamps reversed arguments to 0', () => {
    expect(differenceInMonths(d(2024, 6, 1), d(2024, 5, 1))).toBe(0);
  });
});
