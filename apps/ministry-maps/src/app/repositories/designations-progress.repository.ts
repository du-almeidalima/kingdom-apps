import { Observable } from 'rxjs';

import { DesignationsHeader } from '../../models/designations-header';
import { DesignationProgressEntry, DesignationsProgress, TerritoryProgressEntry } from '../../models/designations-progress';

export abstract class DesignationsProgressRepository {
  /** Live progress document of a header (`undefined` while it does not exist — e.g. legacy headers). */
  abstract getStreamByHeaderId(headerId: string): Observable<DesignationsProgress | undefined>;
  /** Creates the progress doc on first call (merge) and registers the designation's totals. Authenticated only. */
  abstract registerDesignation(header: DesignationsHeader, designationId: string, entry: DesignationProgressEntry): Observable<void>;
  /** Sets (or overwrites on edit) one completed territory entry. Anonymous-safe (rules allow only `territories`). */
  abstract setTerritoryProgress(headerId: string, entry: TerritoryProgressEntry): Observable<void>;
  /** Removes one completed territory entry (undo). Anonymous-safe. */
  abstract removeTerritoryProgress(headerId: string, designationId: string, territoryId: string): Observable<void>;
}
