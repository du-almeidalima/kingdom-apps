import { TerritoryVisitHistory } from './territory-visit-history';

export type Territory = {
  city: string;
  location: GeolocationCoordinates;
  history: TerritoryVisitHistory[];
};
