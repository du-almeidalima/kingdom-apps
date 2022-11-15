import { TerritoryVisitHistory } from './territory-visit-history';

export enum TerritoryIcon {
  MAN = 'm',
  WOMAN = 'w',
  CHILD = 'c',
  COUPLE = 'cp',
  OTHER = 'o',
}

export type Territory = {
  id: string;
  city: string;
  address: string;
  note: string;
  mapsLink?: string;
  congregationId: string;
  icon: TerritoryIcon;
  lastVisit?: Date;
  history: TerritoryVisitHistory[];
};
