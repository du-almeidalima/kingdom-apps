import { randomUUID } from 'crypto';

import { TerritoryIcon } from '../../../src/models/territory';
import { TerritorySeed } from '../types';
import { buildVisitHistory } from './visit-history.factory';

/**
 * Builds a realistic territory seed including a small visit `history`. The
 * seeder derives `recentHistory`/`lastVisit` from `history`, so tests usually
 * only override `history` (or leave the default single visit).
 */
export function buildTerritory(over: Partial<TerritorySeed> = {}): TerritorySeed {
  return {
    id: `territory-${randomUUID()}`,
    city: 'São Paulo',
    address: 'Rua das Flores, 123 - Vila Mariana',
    note: 'Prédio com portaria, falar com o porteiro.',
    mapsLink: 'https://maps.google.com/?q=-23.589,-46.634',
    congregationId: '',
    isBibleStudent: false,
    icon: TerritoryIcon.COUPLE,
    positionIndex: 0,
    peopleQuantity: 1,
    history: [buildVisitHistory()],
    ...over,
  };
}
