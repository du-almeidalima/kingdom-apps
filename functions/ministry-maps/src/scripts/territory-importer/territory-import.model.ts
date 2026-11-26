import type { Timestamp } from 'firebase-admin/firestore';

import { VisitOutcomeEnum } from '../../models/designations-progress';

export type TerritoryIconCode = 'm' | 'w' | 'c' | 'cp' | 'o';

export const TERRITORY_ICON_CODES: readonly TerritoryIconCode[] = ['m', 'w', 'c', 'cp', 'o'];

export type VisitOutcomeKey =
  | 'SPOKE'
  | 'NOT_ANSWERED'
  | 'MOVED'
  | 'ASKED_TO_NOT_VISIT_AGAIN'
  | 'REVISIT';

export const VISIT_OUTCOME_MAP: Readonly<Record<VisitOutcomeKey, VisitOutcomeEnum>> = {
  SPOKE: VisitOutcomeEnum.SPOKE,
  NOT_ANSWERED: VisitOutcomeEnum.NOT_ANSWERED,
  MOVED: VisitOutcomeEnum.MOVED,
  ASKED_TO_NOT_VISIT_AGAIN: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN,
  REVISIT: VisitOutcomeEnum.REVISIT,
};

export const TERRITORY_TSV_HEADERS = [
  'city',
  'address',
  'note',
  'mapGroup',
  'mapsLink',
  'icon',
  'peopleQuantity',
  'positionIndex',
  'isBibleStudent',
  'bibleInstructor',
  'lastVisit',
  'visitOutcome',
  'isRevisit',
  'visitPublisher',
] as const;

export type TerritoryTsvHeader = (typeof TERRITORY_TSV_HEADERS)[number];

export type RawTerritoryImportRow = {
  lineNumber: number;
} & Record<TerritoryTsvHeader, string>;

export type ValidatedTerritoryImportRow = {
  lineNumber: number;
  city: string;
  address: string;
  note: string;
  mapGroup?: string;
  mapsLink?: string;
  icon: TerritoryIconCode;
  peopleQuantity: number;
  positionIndex?: number;
  isBibleStudent: boolean;
  bibleInstructor?: string;
  lastVisit?: Date;
  visitOutcome?: VisitOutcomeEnum;
  isRevisit: boolean;
  visitPublisher?: string;
};

export type TerritoryHistoryFirestoreDoc = {
  id: string;
  notes: string;
  isRevisit: boolean;
  date: Timestamp;
  visitOutcome: VisitOutcomeEnum;
  congregationId: string;
  territoryId: string;
  name?: string;
};

export type TerritoryFirestoreDoc = {
  id: string;
  congregationId: string;
  city: string;
  address: string;
  note: string;
  mapsLink?: string;
  icon: TerritoryIconCode;
  peopleQuantity: number;
  positionIndex: number;
  isBibleStudent: boolean;
  bibleInstructor?: string;
  lastVisit: Timestamp | null;
  recentHistory: TerritoryHistoryFirestoreDoc[];
  isImported: true;
};

export type PlannedTerritoryWrite = {
  territory: TerritoryFirestoreDoc;
  history?: TerritoryHistoryFirestoreDoc;
};
