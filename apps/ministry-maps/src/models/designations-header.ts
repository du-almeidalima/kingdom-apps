import { DesignationsHeaderClosedByEnum } from './enums/designations-header-closed-by';
import { DesignationsHeaderStatusEnum } from './enums/designations-header-status';

/**
 * Groups designations created in one working cycle on Assign Territories, allowing in-progress cycles to be resumed.
 * Cycles are closed manually (Stop button) or automatically by daily cron. Designations link via `designationHeaderId`.
 */
export type DesignationsHeader = {
  id: string;
  congregationId: string;
  status: DesignationsHeaderStatusEnum;
  createdAt: Date;
  createdBy: string;
  /** Set when the status flips to `DONE`. */
  closedAt?: Date;
  /** Provenance of the close (manual Stop button vs daily cron). */
  closedBy?: DesignationsHeaderClosedByEnum;
  /** Firestore TTL deletion date. Deleted automatically ~6 months after creation. */
  expireAt?: Date;
};
