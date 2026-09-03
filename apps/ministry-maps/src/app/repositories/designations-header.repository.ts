import { Observable } from 'rxjs';
import { DesignationsHeader } from '../../models/designations-header';
import { DesignationsHeaderClosedByEnum } from '../../models/enums/designations-header-closed-by';

export abstract class DesignationsHeaderRepository {
  /** Newest `IN_PROGRESS` header for the congregation (one-shot read), or `undefined` when no cycle is open. */
  abstract getInProgressByCongregation(congregationId: string): Observable<DesignationsHeader | undefined>;
  /** Live stream of the newest `IN_PROGRESS` header for the congregation, emitting `undefined` when none is open. */
  abstract getInProgressStreamByCongregation(congregationId: string): Observable<DesignationsHeader | undefined>;
  abstract add(header: Omit<DesignationsHeader, 'id'>): Observable<DesignationsHeader>;
  /** Flips the header to `DONE`, stamping `closedAt`/`closedBy`. */
  abstract close(id: string, closedBy?: DesignationsHeaderClosedByEnum): Observable<void>;
}
