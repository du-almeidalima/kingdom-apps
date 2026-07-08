import { selectionStatus, suggestCapacity } from './capacity';

describe('suggestCapacity', () => {
  it('accounts for leg travel time between stops', () => {
    const result = suggestCapacity({
      pairs: 5,
      durationMin: 120,
      avgLegKm: 2,
      visitMin: 10,
      avgKmh: 30,
    });
    // legMin = 2/30*60 = 4, minutesPerStop = 14, perPair = floor(120/14) = 8
    expect(result.perPair).toBe(8);
    expect(result.suggestedTotal).toBe(40);
  });

  it('treats unknown leg distance (0) as no travel time', () => {
    const result = suggestCapacity({
      pairs: 5,
      durationMin: 120,
      avgLegKm: 0,
      visitMin: 10,
      avgKmh: 30,
    });
    // minutesPerStop = 10, perPair = floor(120/10) = 12
    expect(result.perPair).toBe(12);
    expect(result.suggestedTotal).toBe(60);
  });

  it('applies default visitMin/avgKmh when omitted', () => {
    const result = suggestCapacity({ pairs: 3, durationMin: 120, avgLegKm: 2 });
    expect(result.perPair).toBe(8);
    expect(result.suggestedTotal).toBe(24);
  });

  it('returns zeros when the time budget is non-positive', () => {
    expect(suggestCapacity({ pairs: 5, durationMin: 0, avgLegKm: 2 })).toEqual({
      perPair: 0,
      suggestedTotal: 0,
    });
  });

  it('returns zeros when there are no pairs', () => {
    expect(suggestCapacity({ pairs: 0, durationMin: 120, avgLegKm: 2 })).toEqual({
      perPair: 0,
      suggestedTotal: 0,
    });
  });

  it('never suggests fewer than one territory per pair', () => {
    const result = suggestCapacity({
      pairs: 2,
      durationMin: 5,
      avgLegKm: 2,
      visitMin: 10,
      avgKmh: 30,
    });
    expect(result.perPair).toBe(1);
    expect(result.suggestedTotal).toBe(2);
  });
});

describe('selectionStatus', () => {
  it('is ok exactly at the suggested total', () => {
    expect(selectionStatus(22, 22)).toBe('ok');
  });

  it('is ok within +/-1 of the suggested total', () => {
    expect(selectionStatus(21, 22)).toBe('ok');
    expect(selectionStatus(23, 22)).toBe('ok');
  });

  it('is under when fewer than suggested (beyond tolerance)', () => {
    expect(selectionStatus(18, 22)).toBe('under');
  });

  it('is over when more than suggested (beyond tolerance)', () => {
    expect(selectionStatus(30, 22)).toBe('over');
  });

  it('treats a zero suggestion sensibly', () => {
    expect(selectionStatus(0, 0)).toBe('ok');
    expect(selectionStatus(1, 0)).toBe('ok');
    expect(selectionStatus(2, 0)).toBe('over');
  });
});
