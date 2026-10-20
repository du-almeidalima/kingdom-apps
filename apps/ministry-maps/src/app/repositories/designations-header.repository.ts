import { Observable } from 'rxjs';
import { DesignationsHeader } from '../../models/designations-header';
import { DesignationsHeaderClosedByEnum } from '../../models/enums/designations-header-closed-by';

export abstract class DesignationsHeaderRepository {
  /** Newest `IN_PROGRESS` header for the congregation (one-shot read), or `undefined` when no cycle is open. */
  abstract getInProgressByCongregation(congregationId: string): Observable<DesignationsHeader | undefined>;
  /** Live stream of the newest `IN_PROGRESS` header for the congregation, emitting `undefined` when none is open. */
  abstract getInProgressStreamByCongregation(congregationId: string): Observable<DesignationsHeader | undefined>;
  /** One-shot page of the congregation's headers, newest first. */
  abstract getPageByCongregation(congregationId: string, pageSize: number, startAfterCreatedAt?: Date): Observable<DesignationsHeader[]>;
  /** Live header document (`undefined` when missing, e.g. TTL-deleted). */
  abstract getById(id: string): Observable<DesignationsHeader | undefined>;
  abstract add(header: Omit<DesignationsHeader, 'id'>): Observable<DesignationsHeader>;
  /** Flips the header to `DONE`, stamping `closedAt`/`closedBy`. */
  abstract close(id: string, closedBy?: DesignationsHeaderClosedByEnum): Observable<void>;
}
