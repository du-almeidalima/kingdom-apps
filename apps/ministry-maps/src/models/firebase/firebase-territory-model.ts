import { GeoPoint, Timestamp } from 'firebase/firestore';
import { TerritoryVisitHistory } from '../territory-visit-history';
import { Territory } from '../territory';

export type FirebaseTerritoryVisitHistoryModel = Omit<TerritoryVisitHistory, 'date'> & {
  date: Timestamp;
};

export type FirebaseTerritoryModel = Omit<Territory, 'recentHistory' | 'geo' | 'geocodedAt'> & {
  lastVisit: Timestamp | null;
  recentHistory: FirebaseTerritoryVisitHistoryModel[];
  geo?: GeoPoint | null;
  geocodedAt?: Timestamp | null;
};
