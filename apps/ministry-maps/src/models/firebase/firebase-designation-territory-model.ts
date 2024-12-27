import { Timestamp } from '@angular/fire/firestore';
import { Designation, DesignationTerritory } from '../designation';
import { TerritoryVisitHistory } from '../territory-visit-history';

type FirebaseTerritoryHistoryModel = Omit<TerritoryVisitHistory, 'date'> & {
  date: Timestamp;
};

export type FirebaseDesignationTerritoryModel = Omit<DesignationTerritory, 'history' | 'recentHistory' | 'lastVisit'> & {
  history: FirebaseTerritoryHistoryModel[]
  recentHistory: FirebaseTerritoryHistoryModel[]
  lastVisit: Timestamp
};

export type FirebaseDesignationModel = Omit<Designation, 'territories' | 'createdAt'> & {
  createdAt: Timestamp;
  territories: FirebaseDesignationTerritoryModel[];
};
