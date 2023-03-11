import { Timestamp } from '@angular/fire/firestore';
import { TerritoryVisitHistory } from '../territory-visit-history';
import { Territory } from '../territory';

export type FirebaseRecentVisitModel = Omit<TerritoryVisitHistory, 'date'> & {
  date: Timestamp;
};

export type FirebaseTerritoryModel = Omit<Territory, 'recentHistory'> & {
  lastVisit: Timestamp | null;
  recentHistory: FirebaseRecentVisitModel[];
};
