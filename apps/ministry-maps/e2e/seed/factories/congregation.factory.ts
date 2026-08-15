import { randomUUID } from 'crypto';

import { CongregationSeed } from '../types';

/**
 * Builds a realistic congregation seed. Defaults model a small Brazilian
 * congregation; pass overrides for anything a specific test needs.
 */
export function buildCongregation(over: Partial<CongregationSeed> = {}): CongregationSeed {
  return {
    id: `congregation-${randomUUID()}`,
    name: 'Congregação Central',
    locatedOn: 'São Paulo, SP',
    cities: ['São Paulo', 'Guarulhos'],
    settings: {
      designationAccessExpiryDays: 7,
      shouldDesignationBlockAfterExpired: true,
    },
    ...over,
  };
}
