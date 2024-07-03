import { HearingTerritory } from './hearing-territory';
import { DesignationStatusEnum } from './enums/designation-status';

/**
 * Variant of the {@link Designation} class/type. It wraps the Territory with metadata and is what gets sent to the publisher.
 */
export type HearingDesignation = {
  id: string;
  createdAt: Date;
  createdBy: string;
  status: DesignationStatusEnum;
  territories: HearingTerritory[];
}
