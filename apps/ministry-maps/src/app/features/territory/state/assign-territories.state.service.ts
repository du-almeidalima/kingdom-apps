import { Injectable, computed, signal } from '@angular/core';

import { Designation } from '../../../../models/designation';
import { DesignationsHeader } from '../../../../models/designations-header';

/**
 * Holds Assign Territories state across route navigation: active `designations_header` session and unsubmitted cart.
 * `providedIn: 'root'` preserves state across route changes; header session is persisted in Firestore, cart is in-memory only.
 */
@Injectable({ providedIn: 'root' })
export class AssignTerritoriesStateService {
  // Session state
  readonly header = signal<DesignationsHeader | null>(null);

  /** Designations created in this session: `designationId → territoryIds`. */
  readonly assignedDesignations = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map());

  /** Reverse index of {@link assignedDesignations} (`territoryId → designationId`) for per-row lookups. */
  readonly assignedTerritoryIndex = computed(() => {
    const territoryIdToDesignationId = new Map<string, string>();

    for (const [designationId, territoryIds] of this.assignedDesignations()) {
      for (const territoryId of territoryIds) {
        territoryIdToDesignationId.set(territoryId, designationId);
      }
    }

    return territoryIdToDesignationId;
  });

  readonly assignedTerritoryCount = computed(() => this.assignedTerritoryIndex().size);

  /** Banner + Stop button visibility — never derive them from the assigned count. */
  readonly hasActiveSession = computed(() => this.header() !== null);

  // Unsubmitted selection cart (survives route navigation, in-memory)
  readonly selectedTerritoryIds = signal<ReadonlySet<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedTerritoryIds().size);

  // Loading indicators
  readonly isLoadingSession = signal(false);
  readonly isCreatingAssignment = signal(false);
  readonly isStoppingSession = signal(false);

  /** Sets the active session (header and designations), pruning any cart territories that are now assigned. */
  setSession(header: DesignationsHeader | null, designations: Designation[]): void {
    this.header.set(header);
    this.assignedDesignations.set(toAssignedDesignations(designations));
    this.pruneTerritoriesFromSelection([...this.assignedTerritoryIndex().keys()]);
  }

  setHeader(header: DesignationsHeader | null): void {
    this.header.set(header);
  }

  /** Appends a newly created designation to the in-memory map and prunes its territories from the cart. */
  addAssignedDesignation(designationId: string, territoryIds: string[]): void {
    this.assignedDesignations.update((designations) => new Map(designations).set(designationId, new Set(territoryIds)));
    this.pruneTerritoriesFromSelection(territoryIds);
  }

  setTerritorySelection(territoryId: string, selected: boolean): void {
    this.selectedTerritoryIds.update((selectedIds) => {
      const next = new Set(selectedIds);
      if (selected) {
        next.add(territoryId);
      } else {
        next.delete(territoryId);
      }
      return next;
    });
  }

  /** Clears the active session (header and assigned designations), leaving the selection cart untouched. */
  clearSession(): void {
    this.header.set(null);
    this.assignedDesignations.set(new Map());
  }

  /** Resets every signal to the initial empty state (congregation change / logout). */
  reset(): void {
    this.clearSession();
    this.selectedTerritoryIds.set(new Set());
    this.isLoadingSession.set(false);
    this.isCreatingAssignment.set(false);
    this.isStoppingSession.set(false);
  }

  private pruneTerritoriesFromSelection(territoryIds: string[]): void {
    this.selectedTerritoryIds.update((selectedIds) => {
      const next = new Set(selectedIds);

      for (const territoryId of territoryIds) {
        next.delete(territoryId);
      }

      return next;
    });
  }
}

function toAssignedDesignations(designations: Designation[]): Map<string, ReadonlySet<string>> {
  const designationIdToTerritoryIds = new Map<string, ReadonlySet<string>>();

  for (const designation of designations) {
    designationIdToTerritoryIds.set(designation.id, new Set(designation.territories.map((territory) => territory.id)));
  }

  return designationIdToTerritoryIds;
}
