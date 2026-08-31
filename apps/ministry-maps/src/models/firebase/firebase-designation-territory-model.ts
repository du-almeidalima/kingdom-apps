import { Timestamp } from 'firebase/firestore';
import { Designation, DesignationTerritory } from '../designation';
import { TerritoryVisitHistory } from '../territory-visit-history';

type FirebaseTerritoryHistoryModel = Omit<TerritoryVisitHistory, 'date'> & {
  date: Timestamp;
};

export type FirebaseDesignationTerritoryModel = Omit<
  DesignationTerritory,
  'history' | 'recentHistory' | 'lastVisit'
> & {
  history: FirebaseTerritoryHistoryModel[];
  recentHistory: FirebaseTerritoryHistoryModel[];
  lastVisit: Timestamp;
};

export type FirebaseDesignationModel = Omit<Designation, 'territories' | 'createdAt' | 'expiresAt' | 'expireAt'> & {
  createdAt: Timestamp;
  expiresAt: Timestamp;
  expireAt?: Timestamp;
  territories: FirebaseDesignationTerritoryModel[];
};
