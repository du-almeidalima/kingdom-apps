import { RouteOptimizerService } from './route-optimizer.service';
import { Territory, TerritoryIcon } from '../../../../models/territory';

const T = (id: string, lat: number, lng: number, lastVisitMs?: number): Territory => ({
  id,
  city: 'X',
  address: id,
  note: '',
  congregationId: 'c',
  icon: TerritoryIcon.WOMAN,
  geo: { lat, lng },
  lastVisit: lastVisitMs != null ? new Date(lastVisitMs) : undefined,
});

describe('RouteOptimizerService', () => {
  const svc = new RouteOptimizerService();

  it('starts at the stalest and appends unlocated', () => {
    const stale = T('stale', 1, 1, 1000);
    const fresh = T('fresh', 0, 0, 9_000_000_000_000);
    const mid = T('mid', 0.5, 0.5, 5_000_000_000_000);
    const noGeo: Territory = { ...T('nogeo', 0, 0), geo: undefined };

    const r = svc.optimize([fresh, mid, stale, noGeo]);

    expect(r.ordered[0].id).toBe('stale'); // stalest pinned first
    expect(r.unlocated.map(t => t.id)).toEqual(['nogeo']);
    expect(r.totalKm).toBeGreaterThan(0);
  });

  it('returns a single located territory unchanged', () => {
    const only = T('only', 0, 0, 1000);
    const r = svc.optimize([only]);
    expect(r.ordered.map(t => t.id)).toEqual(['only']);
    expect(r.totalKm).toBe(0);
  });
});
