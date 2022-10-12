import { TerritoryVisitHistory } from './territory-visit-history';

export enum TerritoryIcon {
  MAN = 'm',
  WOMAN = 'w',
  CHILD = 'c',
  OTHER = 'o',
}
export type Territory = {
  city: string;
  address: string;
  congregationId: string;
  icon: TerritoryIcon;
  location: { latitude: number; longitude: number };
  history: TerritoryVisitHistory[];
};
