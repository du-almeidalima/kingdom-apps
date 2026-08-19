import { splitRouteIntoTeams } from './split-route';

// Deterministic PRNG so a failure is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Item = { id: string; geo: { lat: number; lng: number } };

describe('splitRouteIntoTeams fuzz invariants', () => {
  it('holds all invariants over 5000 random cases', () => {
    const rnd = mulberry32(12345);
    for (let iter = 0; iter < 5000; iter++) {
      const n = Math.floor(rnd() * 41); // 0..40
      const pairs = 1 + Math.floor(rnd() * 8); // 1..8
      const cars = Math.floor(rnd() * 9); // 0..8
      const ordered: Item[] = Array.from({ length: n }, (_, i) => ({
        id: `t${i}`,
        geo: { lat: -22.7 + (rnd() - 0.5) * 0.3, lng: -47.3 + (rnd() - 0.5) * 0.3 },
      }));

      const r = splitRouteIntoTeams(ordered, { pairs, cars });
      const ctx = `iter=${iter} n=${n} pairs=${pairs} cars=${cars}`;

      // effectivePairs
      const expectedK = n === 0 ? 0 : Math.min(pairs, n);
      expect(r.effectivePairs).toBe(expectedK);
      expect(r.teams).toHaveLength(expectedK);

      // coverage: every item exactly once, in order
      const flat = r.teams.flatMap(t => t.items);
      expect(flat).toEqual(ordered);

      // no empty teams when there is work
      if (n > 0) expect(r.teams.every(t => t.items.length >= 1)).toBe(true);

      // numeric sanity
      for (const t of r.teams) {
        expect(Number.isFinite(t.totalKm)).toBe(true);
        expect(t.totalKm).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(t.estMinutes)).toBe(true);
        expect(t.estMinutes).toBeGreaterThanOrEqual(0);
      }

      // car-aware: exactly max(0, K - cars) car-less teams, ranked lowest by
      // (lone-stop, then internal km) - no car-having team may rank strictly before a car-less one.
      const carless = r.teams.filter(t => !t.hasCar);
      expect(carless.length).toBe(Math.max(0, expectedK - cars));
      if (carless.length && carless.length < expectedK) {
        const lone = (t: { items: unknown[] }) => (t.items.length >= 2 ? 0 : 1);
        const carHaving = r.teams.filter(t => t.hasCar);
        for (const cl of carless) {
          for (const ch of carHaving) {
            const chStrictlyBefore =
              lone(ch) < lone(cl) || (lone(ch) === lone(cl) && ch.totalKm < cl.totalKm - 1e-9);
            expect(chStrictlyBefore).toBe(false); // ctx: ${ctx}
          }
        }
      }
    }
  });
});
