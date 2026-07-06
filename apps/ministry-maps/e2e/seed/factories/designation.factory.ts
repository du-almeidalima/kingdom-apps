import { randomUUID } from 'crypto';

import { DesignationStatusEnum } from '../../../src/models/enums/designation-status';
import { DesignationTerritory } from '../../../src/models/designation';
import { TerritoryIcon } from '../../../src/models/territory';
import { DesignationSeed } from '../types';

/** Builds a single embedded designation territory with a `PENDING` status. */
export function buildDesignationTerritory(
  over: Partial<DesignationTerritory> = {},
): DesignationTerritory {
  return {
    id: `territory-${randomUUID()}`,
    city: 'São Paulo',
    address: 'Av. Paulista, 1000 - Bela Vista',
    note: '',
    congregationId: '',
    icon: TerritoryIcon.MAN,
    status: DesignationStatusEnum.PENDING,
    ...over,
  };
}

/**
 * Builds a realistic designation seed. `createdAt`/`expiresAt` are plain
 * `Date`s (persisted as Firestore `Timestamp`s) and embed one territory by
 * default.
 */
export function buildDesignation(over: Partial<DesignationSeed> = {}): DesignationSeed {
  const createdAt = new Date('2024-02-01T08:00:00.000Z');
  const expiresAt = new Date('2024-02-08T08:00:00.000Z');

  return {
    id: `designation-${randomUUID()}`,
    congregationId: '',
    createdBy: '',
    createdAt,
    expiresAt,
    territories: [buildDesignationTerritory()],
    settings: {
      shouldDesignationBlockAfterExpired: true,
    },
    ...over,
  };
}
