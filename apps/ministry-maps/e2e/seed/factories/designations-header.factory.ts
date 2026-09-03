import { randomUUID } from 'crypto';

import { DesignationsHeaderStatusEnum } from '../../../src/models/enums/designations-header-status';
import { DesignationsHeaderSeed } from '../types';

/**
 * Builds a designations_header seed (`IN_PROGRESS` by default). `closedAt`/`closedBy` are only set on `DONE` status.
 */
export function buildDesignationsHeader(over: Partial<DesignationsHeaderSeed> = {}): DesignationsHeaderSeed {
  return {
    id: `designations-header-${randomUUID()}`,
    congregationId: '',
    status: DesignationsHeaderStatusEnum.IN_PROGRESS,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    createdBy: '',
    ...over,
  };
}
