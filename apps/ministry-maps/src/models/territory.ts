import { TerritoryVisitHistory } from './territory-visit-history';

export type Territory = {
  city: string;
  address: string;
  congregationId: string;
  location: GeolocationCoordinates;
  history: TerritoryVisitHistory[];
};
