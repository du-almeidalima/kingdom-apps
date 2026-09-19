import { Injectable, inject } from '@angular/core';
import { Territory } from '../../../../models/territory';
import { splitRouteIntoTeams, haversineKm, GeoPointLike } from '../../../shared/route-optimizer';
import { RouteOptimizerService } from './route-optimizer.service';
import { formGroups, GroupPlan, WorkGroup } from './pairing';

const AVG_KMH = 30;
/** Fallback minutes spent per visited person when the caller doesn't specify. */
const DEFAULT_VISIT_MIN = 15;
const DEFAULT_DURATION_MIN = 120;
/** Minimum seats we assume every car has (owner rule: "cars are >= 5 at minimum"). */
export const SEATS_PER_CAR = 5;

export interface CarPlan {
  carIndex: number; // 0-based
  territories: Territory[]; // this car's stops, in route order (unlocated appended)
  groups: WorkGroup[]; // the pairs/trios riding in this car
  pairs: number;
  trios: number;
  people: number;
  men: number;
  women: number;
  noManWithWomen: boolean; // car carries women but no man (a safety concern)
  perGroupTerritories: number; // territories each pair/trio in this car handles (they work in parallel)
  overCapacity: boolean; // people in this car exceed SEATS_PER_CAR
  totalKm: number;
  estMinutes: number;
}

export interface DistributionPlan {
  cars: CarPlan[];
  unlocated: Territory[];
  totalKm: number;
  avgLegKm: number;
  groupPlan: GroupPlan; // overall composition + any unplaced people
  carsAvailable: number; // cars the crew has
  carsNeeded: number; // minimum cars to seat everyone at <= SEATS_PER_CAR
  effectiveCars: number; // cars actually sent out (may be fewer - leaving cars behind)
  carsLeftBehind: number; // carsAvailable - effectiveCars
  withinBudget: boolean; // every car sent fits the duration budget
  seatWarning: boolean; // not enough cars to seat everyone at <= SEATS_PER_CAR
}

export interface TeamInput {
  men: number;
  women: number;
  cars: number;
  visitMin?: number; // avg minutes spent per visited person (default 15)
  durationMin?: number; // session time budget (default 120)
  economize?: boolean; // true (default) = fewest cars; false = spread across all available cars
}

@Injectable({ providedIn: 'root' })
export class TeamDistributionService {
  private readonly optimizer = inject(RouteOptimizerService);

  /**
   * Full plan: form work groups (pairs/trios) from men+women, optimize the selected
   * territories, split the route one segment per work group, then pack the groups into
   * cars - never more than SEATS_PER_CAR people per car. Territories without coordinates
   * are spread round-robin across the cars and never dropped.
   *
   * `economize` (default true) uses the FEWEST cars (leaving spare cars behind); when
   * false, the groups are spread across all of the crew's cars.
   */
  distribute(selected: Territory[], team: TeamInput): DistributionPlan {
    const visitMin = team.visitMin && team.visitMin > 0 ? team.visitMin : DEFAULT_VISIT_MIN;
    const durationMin = team.durationMin && team.durationMin > 0 ? team.durationMin : DEFAULT_DURATION_MIN;
    const economize = team.economize !== false;
    const groupPlan = formGroups(team.men, team.women);
    const numGroups = Math.max(1, groupPlan.groups.length);

    const { ordered, unlocated, totalKm } = this.optimizer.optimize(selected);

    // One balanced route segment per work group (independent of how many cars we send).
    const { teams } = splitRouteIntoTeams(ordered, { pairs: numGroups, cars: numGroups, visitMin });
    const segments = teams.map(t => t.items);
    while (segments.length < numGroups) segments.push([]);

    const carsAvailable = Math.max(1, Math.floor(team.cars) || 1);
    const groups = groupPlan.groups;

    // Minimum cars to seat everyone at <= SEATS_PER_CAR (pack tight, no car cap).
    const carsNeeded = this.packGroups(groups, SEATS_PER_CAR, Number.MAX_SAFE_INTEGER).length;

    // Economize: fill each car up to SEATS_PER_CAR -> fewest cars, leaving spares behind.
    // Otherwise: spread the groups across all of the crew's cars (fewer people per car,
    // tighter clusters). Both keep every car <= SEATS_PER_CAR whenever there are enough cars.
    const packed = economize
      ? this.packGroups(groups, SEATS_PER_CAR, carsAvailable)
      : this.evenSplit(groups, carsAvailable);

    // No valid work groups (e.g. no crew entered, or a lone man+woman who can't pair):
    // return an empty plan rather than crashing or silently dropping the selection.
    if (packed.length === 0) {
      const legs0 = Math.max(1, ordered.length - 1);
      return {
        cars: [],
        unlocated,
        totalKm,
        avgLegKm: Math.round((totalKm / legs0) * 100) / 100,
        groupPlan,
        carsAvailable,
        carsNeeded,
        effectiveCars: 0,
        carsLeftBehind: 0,
        withinBudget: true,
        seatWarning: false,
      };
    }

    const cars = this.buildCars(packed, groups, segments, unlocated, visitMin);
    const legs = Math.max(1, ordered.length - 1);
    const avgLegKm = Math.round((totalKm / legs) * 100) / 100;
    const effectiveCars = cars.length;

    return {
      cars,
      unlocated,
      totalKm,
      avgLegKm,
      groupPlan,
      carsAvailable,
      carsNeeded,
      effectiveCars,
      carsLeftBehind: Math.max(0, carsAvailable - effectiveCars),
      withinBudget: cars.every(c => c.estMinutes <= durationMin),
      seatWarning: carsNeeded > carsAvailable,
    };
  }

  /**
   * Greedily packs consecutive work groups into cars, never exceeding SEATS_PER_CAR
   * people. Returns groups of group-indices (contiguous, so each car stays a tight
   * geographic cluster). Starts a new car when the current one hits `targetPerCar` or
   * would overflow - up to `maxCars` (past that, groups overflow the last car).
   */
  private packGroups(groups: WorkGroup[], targetPerCar: number, maxCars: number): number[][] {
    const people = (car: number[]) => car.reduce((s, idx) => s + groups[idx].size, 0);
    const cars: number[][] = [[]];
    for (let i = 0; i < groups.length; i++) {
      const cur = cars[cars.length - 1];
      const p = people(cur);
      const wouldOverflow = p + groups[i].size > SEATS_PER_CAR;
      const reachedTarget = p >= targetPerCar;
      if (cur.length > 0 && (wouldOverflow || reachedTarget) && cars.length < maxCars) {
        cars.push([i]);
      } else if (cur.length > 0 && wouldOverflow) {
        // Out of cars but this group won't fit - drop it into the least-full car so the
        // unavoidable overflow is spread evenly instead of piling onto the last car.
        let best = cur;
        for (const c of cars) if (people(c) < people(best)) best = c;
        best.push(i);
      } else {
        cur.push(i);
      }
    }
    return cars.filter(c => c.length > 0);
  }

  /**
   * Spreads the work groups evenly (by count) across up to `maxCars` cars - one contiguous
   * chunk per car. Used when NOT economizing, to put fewer people in each car and split the
   * route into smaller, tighter clusters. Stays <= SEATS_PER_CAR whenever cars are sufficient.
   */
  private evenSplit(groups: WorkGroup[], maxCars: number): number[][] {
    const cars = Math.max(1, Math.min(maxCars, groups.length));
    const base = Math.floor(groups.length / cars);
    const extra = groups.length % cars;
    const res: number[][] = [];
    let g = 0;
    for (let c = 0; c < cars; c++) {
      const cnt = base + (c < extra ? 1 : 0);
      const idx: number[] = [];
      for (let k = 0; k < cnt; k++) idx.push(g++);
      res.push(idx);
    }
    return res;
  }

  private buildCars(
    packed: number[][],
    groups: WorkGroup[],
    segments: Territory[][],
    unlocated: Territory[],
    visitMin: number
  ): CarPlan[] {
    const cars: CarPlan[] = packed.map((indices, c) => {
      const carGroups = indices.map(i => groups[i]);
      const carTerritories = indices.flatMap(i => segments[i]);
      const men = carGroups.reduce((s, x) => s + x.men, 0);
      const women = carGroups.reduce((s, x) => s + x.women, 0);
      return {
        carIndex: c,
        territories: carTerritories,
        groups: carGroups,
        pairs: carGroups.filter(x => x.kind === 'pair').length,
        trios: carGroups.filter(x => x.kind === 'trio').length,
        people: men + women,
        men,
        women,
        noManWithWomen: women > 0 && men === 0,
        perGroupTerritories: 0,
        overCapacity: men + women > SEATS_PER_CAR,
        totalKm: 0,
        estMinutes: 0,
      };
    });

    // Spread unlocated territories round-robin across the cars (never dropped).
    unlocated.forEach((u, i) => cars[i % cars.length].territories.push(u));

    // Per-car travel + elapsed time. Groups inside a car work in PARALLEL, so elapsed
    // time is the whole car workload divided by how many groups it carries.
    for (const car of cars) {
      let km = 0;
      const located = car.territories.filter(t => t.geo);
      for (let i = 1; i < located.length; i++) {
        km += haversineKm(located[i - 1].geo as GeoPointLike, located[i].geo as GeoPointLike);
      }
      car.totalKm = Math.round(km * 10) / 10;
      const groupsN = Math.max(1, car.groups.length);
      const totalWorkMin = visitMin * car.territories.length + (car.totalKm / AVG_KMH) * 60;
      car.estMinutes = Math.round(totalWorkMin / groupsN);
      car.perGroupTerritories = Math.round(car.territories.length / groupsN);
    }

    return cars;
  }
}
