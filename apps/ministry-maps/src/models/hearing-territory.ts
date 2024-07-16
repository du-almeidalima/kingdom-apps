import { HearingTerritoryStreet } from './hearing-territory-street';
import { HearingBuilding } from './hearing-building';

/** Represents streets of a Block. This is the unit that can be selected to be given to the publisher to work. */
export type HearingTerritory = {
  id: string;
  name: string;
  note?: string;
  mapsLink?: string;
  createdAt?: Date;
  congregationId: string;
  /** Order in which it will be sorted. */
  positionIndex?: number;
  lastDesignation?: Date;
  streets: HearingTerritoryStreet[];
  buildings: HearingBuilding[];
  /** This property exists to avoid having to do extra computation/fetch to get this information. */
  visitedBuildings: HearingBuilding[];
}
