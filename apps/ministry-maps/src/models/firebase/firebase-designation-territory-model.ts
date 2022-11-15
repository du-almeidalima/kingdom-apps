import { Timestamp } from '@angular/fire/firestore';
import { Designation, DesignationTerritory } from '../designation';
import { TerritoryVisitHistory } from '../territory-visit-history';

type FirebaseTerritoryHistoryModel = Omit<TerritoryVisitHistory, 'date'> & {
  date: Timestamp;
};

export type FirebaseDesignationTerritoryModel = Omit<DesignationTerritory, 'history'> & {
  history: FirebaseTerritoryHistoryModel[]
};

export type FirebaseDesignationModel = Omit<Designation, 'territories'> & {
  territories: FirebaseDesignationTerritoryModel[];
};
