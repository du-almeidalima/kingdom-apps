import { TestBed } from '@angular/core/testing';
import { TeamDistributionService } from './team-distribution.service';
import { Territory, TerritoryIcon } from '../../../../models/territory';

const T = (id: string, lat: number, lng: number, geo = true): Territory => ({
  id,
  city: 'X',
  address: id,
  note: '',
  congregationId: 'c',
  icon: TerritoryIcon.WOMAN,
  geo: geo ? { lat, lng } : undefined,
  lastVisit: new Date(1000),
});

describe('TeamDistributionService', () => {
  let svc: TeamDistributionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(TeamDistributionService);
  });

  it('covers every territory and never exceeds 5 people per car', () => {
    const sel = Array.from({ length: 12 }, (_, i) => T(`t${i}`, 0, i));
    const plan = svc.distribute(sel, { men: 12, women: 8, cars: 6, durationMin: 120 });
    expect(plan.groupPlan.pairs + plan.groupPlan.trios).toBe(10);
    const all = plan.cars.flatMap(c => c.territories.map(t => t.id)).sort();
    expect(all).toEqual(sel.map(t => t.id).sort());
    expect(plan.cars.every(c => c.people <= 5)).toBe(true); // hard cap enforced
  });

  it('economizes to the fewest cars and leaves spares behind', () => {
    const sel = Array.from({ length: 12 }, (_, i) => T(`t${i}`, 0, i));
    const plan = svc.distribute(sel, { men: 12, women: 8, cars: 6, economize: true, durationMin: 120 });
    expect(plan.carsNeeded).toBe(5); // 10 pairs, 2 per car (4 people <= 5)
    expect(plan.effectiveCars).toBe(5);
    expect(plan.carsLeftBehind).toBe(1);
    expect(plan.cars.every(c => c.people <= 5)).toBe(true);
  });

  it('spreads across more cars when economize is off (still <= 5 per car)', () => {
    const sel = Array.from({ length: 8 }, (_, i) => T(`t${i}`, 0, i));
    const on = svc.distribute(sel, { men: 4, women: 4, cars: 4, economize: true, durationMin: 120 });
    const off = svc.distribute(sel, { men: 4, women: 4, cars: 4, economize: false, durationMin: 120 });
    expect(on.effectiveCars).toBe(2); // 4 pairs, 2 per car
    expect(off.effectiveCars).toBeGreaterThan(on.effectiveCars); // uses more of the 4 cars
    expect(off.cars.every(c => c.people <= 5)).toBe(true);
  });

  it('warns when there are not enough cars to seat everyone at 5 per car', () => {
    const sel = Array.from({ length: 6 }, (_, i) => T(`t${i}`, 0, i));
    const plan = svc.distribute(sel, { men: 12, women: 8, cars: 3, durationMin: 120 }); // needs 5 cars, has 3
    expect(plan.carsNeeded).toBeGreaterThan(plan.carsAvailable);
    expect(plan.seatWarning).toBe(true);
  });

  it('never drops unlocated territories', () => {
    const sel = [T('a', 0, 0), T('n1', 0, 0, false), T('n2', 0, 0, false)];
    const plan = svc.distribute(sel, { men: 4, women: 2, cars: 2, durationMin: 120 });
    const all = plan.cars.flatMap(c => c.territories.map(t => t.id)).sort();
    expect(all).toEqual(['a', 'n1', 'n2']);
  });

  it('returns an empty plan (never crashes/drops) when the crew forms no work groups', () => {
    const sel = [T('a', 0, 0), T('n1', 0, 0, false)]; // includes an unlocated territory
    // 1 man + 1 woman form zero same-sex groups; must not throw on the unlocated round-robin.
    expect(() => svc.distribute(sel, { men: 1, women: 1, cars: 2, durationMin: 120 })).not.toThrow();
    const plan = svc.distribute(sel, { men: 1, women: 1, cars: 2, durationMin: 120 });
    expect(plan.cars).toEqual([]);
    expect(plan.effectiveCars).toBe(0);
    expect(plan.groupPlan.unplacedMen).toBe(1);
  });

  it('surfaces unplaced people from the group plan', () => {
    const sel = Array.from({ length: 4 }, (_, i) => T(`t${i}`, 0, i));
    const plan = svc.distribute(sel, { men: 1, women: 0, cars: 1, durationMin: 120 });
    expect(plan.groupPlan.unplacedMen).toBe(1);
  });
});
