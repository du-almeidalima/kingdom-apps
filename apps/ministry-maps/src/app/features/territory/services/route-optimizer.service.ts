import { Injectable } from '@angular/core';
import { Territory } from '../../../../models/territory';
import {
  buildHaversineMatrix,
  solveTour,
  solveNearestNeighborTwoOpt,
  HEURISTIC_MAX_N,
  GeoPointLike,
} from '../../../shared/route-optimizer';

export interface OptimizeResult {
  ordered: Territory[];
  unlocated: Territory[];
  totalKm: number;
}

@Injectable({ providedIn: 'root' })
export class RouteOptimizerService {
  /**
   * Orders the selected territories into a short driving path by straight-line
   * distance, oriented to START at the stalest (most overdue) one. Territories
   * without a cached `geo` are appended at the end, flagged as unlocated.
   */
  optimize(selected: Territory[]): OptimizeResult {
    const located = selected.filter(t => t.geo);
    const unlocated = selected.filter(t => !t.geo);

    if (located.length <= 1) {
      return { ordered: located, unlocated, totalKm: 0 };
    }

    // Orient the route to start at the stalest territory (index 0 is the pinned start).
    // Missing lastVisit is treated as most stale (never visited).
    const stalest = (t: Territory): number => (t.lastVisit ? t.lastVisit.getTime() : 0);
    const byStalest = [...located].sort((a, b) => stalest(a) - stalest(b));

    const points: GeoPointLike[] = byStalest.map(t => t.geo as GeoPointLike);
    const matrix = buildHaversineMatrix(points);

    const solver = points.length > HEURISTIC_MAX_N ? solveNearestNeighborTwoOpt : solveTour;
    const { order, totalDistance } = solver({
      durationMatrix: matrix,
      distanceMatrix: matrix,
      endpoint: 'open',
    });

    const ordered = order.map(i => byStalest[i]);
    return { ordered, unlocated, totalKm: Math.round(totalDistance * 10) / 10 };
  }
}
