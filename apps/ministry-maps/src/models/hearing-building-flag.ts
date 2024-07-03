import { HearingBuildingFlagEnum } from './enums/hearing-building-flag';

/**
 * Flag that a {@link HearingBuilding} can be marked with.
 * This should produce some kind of indication to the appointed brother or publisher.
 */
export type HearingBuildingFlag = {
  type: HearingBuildingFlagEnum;
  createdAt: Date;
  createdBy: string;
};
