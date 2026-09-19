import { buildHaversineMatrix, haversineKm } from './haversine';
import { solveTour, StepCapExceededError } from './solve-tour';

describe('haversine', () => {
  it('is ~0 for identical points and symmetric', () => {
    const a = { lat: -22.74, lng: -47.33 };
    expect(haversineKm(a, a)).toBeCloseTo(0, 5);
    const b = { lat: -22.7, lng: -47.29 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe('solveTour (open path from index 0)', () => {
  it('orders a unit square as the obvious perimeter path', () => {
    // 0=(0,0) 1=(0,1) 2=(1,1) 3=(1,0) - colinear-free square
    const pts = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    const m = buildHaversineMatrix(pts);
    const { order } = solveTour({ durationMatrix: m, distanceMatrix: m, endpoint: 'open' });
    expect(order[0]).toBe(0); // start pinned at index 0
    // neighbours 1 and 3 are adjacent to 0; 2 is the far corner and must be visited between them
    expect(order[2]).toBe(2);
    expect(new Set(order)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('throws StepCapExceededError above 15 stops', () => {
    const n = 16;
    const m = Array.from({ length: n }, () => new Array(n).fill(1));
    expect(() => solveTour({ durationMatrix: m, distanceMatrix: m, endpoint: 'open' })).toThrow(StepCapExceededError);
  });
});
