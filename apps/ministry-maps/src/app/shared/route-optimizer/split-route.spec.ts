import { splitRouteIntoTeams } from './split-route';

type Item = { id: string; geo: { lat: number; lng: number } };
const P = (id: string, lng: number, lat = 0): Item => ({ id, geo: { lat, lng } });

describe('splitRouteIntoTeams', () => {
  it('returns nothing for empty input', () => {
    const r = splitRouteIntoTeams<Item>([], { pairs: 3, cars: 3 });
    expect(r.teams).toEqual([]);
    expect(r.effectivePairs).toBe(0);
  });

  it('splits 6 uniform stops into 3 contiguous teams of 2, all with cars', () => {
    const ordered = [0, 1, 2, 3, 4, 5].map(i => P(`t${i}`, i));
    const r = splitRouteIntoTeams(ordered, { pairs: 3, cars: 3 });
    expect(r.effectivePairs).toBe(3);
    expect(r.teams.map(t => t.items.length)).toEqual([2, 2, 2]);
    expect(r.teams.map(t => t.items.map(i => i.id))).toEqual([
      ['t0', 't1'],
      ['t2', 't3'],
      ['t4', 't5'],
    ]);
    expect(r.teams.every(t => t.hasCar)).toBe(true);
    r.teams.forEach(t => {
      expect(t.totalKm).toBeGreaterThan(0);
      expect(t.estMinutes).toBeGreaterThan(0);
    });
  });

  it('assigns every stop exactly once, in order (invariant)', () => {
    const ordered = [0, 1, 2, 3, 4, 5, 6].map(i => P(`t${i}`, i * 0.5, -22.7));
    const r = splitRouteIntoTeams(ordered, { pairs: 3, cars: 3 });
    const flat = r.teams.flatMap(t => t.items);
    expect(flat).toEqual(ordered);
  });

  it('never makes more teams than stops', () => {
    const ordered = [0, 1, 2].map(i => P(`t${i}`, i));
    const r = splitRouteIntoTeams(ordered, { pairs: 5, cars: 5 });
    expect(r.requestedPairs).toBe(5);
    expect(r.effectivePairs).toBe(3);
    expect(r.teams).toHaveLength(3);
    expect(r.teams.every(t => t.items.length === 1)).toBe(true);
  });

  it('gives the shortest sub-route to the single car-less team when cars < pairs', () => {
    // Last pair of stops is much closer together -> that segment has the smallest km.
    const ordered = [P('a', 0), P('b', 1), P('c', 2), P('d', 3), P('e', 4), P('f', 4.02)];
    const r = splitRouteIntoTeams(ordered, { pairs: 3, cars: 2 });
    const carless = r.teams.filter(t => !t.hasCar);
    expect(carless).toHaveLength(1);
    const minKm = Math.min(...r.teams.map(t => t.totalKm));
    expect(carless[0].totalKm).toBe(minKm);
  });

  it('balances by internal travel, not the phantom inter-team leg', () => {
    // A --~10km-- B -~0.5km- C. Into 2 teams, the balanced split by reported (internal)
    // time is {A} | {B,C} (10 | 21 min), NOT {A,B} | {C} (40 | 10 min).
    const A = P('A', 0), B = P('B', 0.08983), C = P('C', 0.094322);
    const r = splitRouteIntoTeams([A, B, C], { pairs: 2, cars: 2 });
    expect(r.teams.map(t => t.items.map(i => i.id))).toEqual([['A'], ['B', 'C']]);
  });

  it('gives everyone a car when cars >= pairs', () => {
    const ordered = [0, 1, 2, 3].map(i => P(`t${i}`, i));
    const r = splitRouteIntoTeams(ordered, { pairs: 2, cars: 4 });
    expect(r.teams.every(t => t.hasCar)).toBe(true);
  });
});
