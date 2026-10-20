import { EMPTY, Observable } from 'rxjs';

import { DesignationsProgressRepository } from '../../../app/repositories/designations-progress.repository';
import { DesignationsHeader } from '../../../models/designations-header';
import { DesignationProgressEntry, DesignationsProgress, TerritoryProgressEntry } from '../../../models/designations-progress';

export class DesignationsProgressRepositoryMock implements DesignationsProgressRepository {
  getStreamByHeaderId(_headerId: string): Observable<DesignationsProgress | undefined> { return EMPTY; }
  registerDesignation(_header: DesignationsHeader, _designationId: string, _entry: DesignationProgressEntry): Observable<void> { return EMPTY; }
  setTerritoryProgress(_headerId: string, _entry: TerritoryProgressEntry): Observable<void> { return EMPTY; }
  removeTerritoryProgress(_headerId: string, _designationId: string, _territoryId: string): Observable<void> { return EMPTY; }
}

export const designationsProgressMockBuilder = (partial: Partial<DesignationsProgress> = {}): DesignationsProgress => ({
  id: 'summary', headerId: 'DESIGNATIONS-HEADER-1', congregationId: 'CONGREGATION-1', designations: {}, territories: {}, ...partial,
});
