import { HearingBuildingStatusEnum } from './enums/hearing-building-status';
import { HearingBuildingFlag } from './hearing-building-flag';

/**
 * Represents a building (house, building, tent) that a territory/block has.
 * This is the smallest unit of a {@link HearingTerritory}.
 */
export type HearingBuilding = {
  id: string;
  number: string;
  streetId: string;
  /** Date when this building has been visited. Will be erased when this Territory is reset. */
  lastVisit?: Date;
  status: HearingBuildingStatusEnum;
  flags?: HearingBuildingFlag[];
}
