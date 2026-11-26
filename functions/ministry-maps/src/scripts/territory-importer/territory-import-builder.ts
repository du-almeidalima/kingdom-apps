import { Timestamp } from 'firebase-admin/firestore';

import {
  PlannedTerritoryWrite,
  TerritoryFirestoreDoc,
  TerritoryHistoryFirestoreDoc,
  ValidatedTerritoryImportRow,
} from './territory-import.model';

export const formatImportedTerritoryNote = (note: string, mapGroup?: string): string => {
  const trimmedNote = note.trim();
  const trimmedGroup = mapGroup?.trim() ?? '';

  if (trimmedGroup && trimmedNote) {
    return `${trimmedGroup}: ${trimmedNote}`;
  }
  if (trimmedGroup) {
    return trimmedGroup;
  }
  return trimmedNote;
};

export const buildTerritoryImportPlan = (
  rows: readonly ValidatedTerritoryImportRow[],
  congregationId: string,
  generateTerritoryId: () => string,
): PlannedTerritoryWrite[] => {
  const usedPositionsByCity = new Map<string, Set<number>>();
  for (const row of rows) {
    if (row.positionIndex === undefined) continue;
    const set = usedPositionsByCity.get(row.city) ?? new Set<number>();
    set.add(row.positionIndex);
    usedPositionsByCity.set(row.city, set);
  }

  const nextAutoPositionByCity = new Map<string, number>();
  const allocatePositionIndex = (city: string, explicitIndex?: number): number => {
    if (explicitIndex !== undefined) {
      return explicitIndex;
    }
    const used = usedPositionsByCity.get(city) ?? new Set<number>();
    let candidate = nextAutoPositionByCity.get(city) ?? 0;
    while (used.has(candidate)) {
      candidate++;
    }
    used.add(candidate);
    usedPositionsByCity.set(city, used);
    nextAutoPositionByCity.set(city, candidate + 1);
    return candidate;
  };

  return rows.map((row) => {
    const territoryId = generateTerritoryId();
    const positionIndex = allocatePositionIndex(row.city, row.positionIndex);
    const lastVisitTimestamp = row.lastVisit ? Timestamp.fromDate(row.lastVisit) : null;

    let history: TerritoryHistoryFirestoreDoc | undefined;
    if (row.lastVisit && lastVisitTimestamp && row.visitOutcome !== undefined) {
      history = {
        id: row.lastVisit.getTime().toString(),
        notes: '',
        isRevisit: row.isRevisit,
        date: lastVisitTimestamp,
        visitOutcome: row.visitOutcome,
        congregationId,
        territoryId,
        ...(row.visitPublisher ? { name: row.visitPublisher } : {}),
      };
    }

    const territory: TerritoryFirestoreDoc = {
      id: territoryId,
      congregationId,
      city: row.city,
      address: row.address,
      note: formatImportedTerritoryNote(row.note, row.mapGroup),
      ...(row.mapsLink ? { mapsLink: row.mapsLink } : {}),
      icon: row.icon,
      peopleQuantity: row.peopleQuantity,
      positionIndex,
      isBibleStudent: row.isBibleStudent,
      ...(row.bibleInstructor ? { bibleInstructor: row.bibleInstructor } : {}),
      lastVisit: lastVisitTimestamp,
      recentHistory: history ? [history] : [],
      isImported: true,
    };

    return {
      territory,
      ...(history ? { history } : {}),
    };
  });
};
