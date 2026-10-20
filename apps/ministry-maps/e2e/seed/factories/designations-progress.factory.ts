import { DesignationsProgressSeed } from '../types';

/** Callers must provide the owning headerId and congregationId. */
export function buildDesignationsProgress(over: Partial<DesignationsProgressSeed> = {}): DesignationsProgressSeed {
  return {
    id: 'summary',
    headerId: '',
    congregationId: '',
    designations: {},
    territories: {},
    ...over,
  };
}
