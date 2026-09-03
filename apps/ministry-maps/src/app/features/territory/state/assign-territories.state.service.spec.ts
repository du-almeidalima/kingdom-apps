import { TestBed } from '@angular/core/testing';

import { AssignTerritoriesStateService } from './assign-territories.state.service';
import { Designation } from '../../../../models/designation';
import { DesignationsHeader } from '../../../../models/designations-header';
import { designationsHeaderMockBuilder } from '../../../../test/mocks';

const designation = (id: string, territoryIds: string[]): Designation =>
  ({ id, territories: territoryIds.map((territoryId) => ({ id: territoryId })) }) as unknown as Designation;

const header: DesignationsHeader = designationsHeaderMockBuilder({ id: 'HEADER-1' });

describe('AssignTerritoriesStateService', () => {
  let service: AssignTerritoriesStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AssignTerritoriesStateService],
    });

    service = TestBed.inject(AssignTerritoriesStateService);
  });

  describe('selection cart', () => {
    it('accumulates and removes territory ids', () => {
      service.setTerritorySelection('T1', true);
      service.setTerritorySelection('T2', true);
      service.setTerritorySelection('T1', false);

      expect(service.selectedTerritoryIds()).toEqual(new Set(['T2']));
      expect(service.selectedCount()).toBe(1);
    });

    it('holds the same cart instance across injects (survives route navigation)', () => {
      const second = TestBed.inject(AssignTerritoriesStateService);
      expect(second).toBe(service);
    });

    it('adds assigned designation and prunes selection cart via addAssignedDesignation', () => {
      service.setTerritorySelection('T1', true);
      service.setTerritorySelection('T2', true);
      service.addAssignedDesignation('D1', ['T1']);

      expect(service.assignedDesignations().get('D1')).toEqual(new Set(['T1']));
      expect(service.selectedTerritoryIds()).toEqual(new Set(['T2']));
      expect(service.assignedTerritoryCount()).toBe(1);
    });
  });

  describe('setSession', () => {
    it('sets header and assigned designations, updating computed indexes and active state', () => {
      service.setSession(header, [designation('D1', ['T1', 'T2']), designation('D2', ['T3'])]);

      expect(service.header()).toBe(header);
      expect(service.hasActiveSession()).toBe(true);
      expect(service.assignedTerritoryCount()).toBe(3);
      expect(service.assignedTerritoryIndex().get('T3')).toBe('D2');
    });

    it('sets empty session when header is null', () => {
      service.setSession(null, []);

      expect(service.header()).toBeNull();
      expect(service.hasActiveSession()).toBe(false);
      expect(service.assignedTerritoryCount()).toBe(0);
    });

    it('prunes from the cart territories that became assigned in the session', () => {
      service.setTerritorySelection('T1', true);
      service.setTerritorySelection('T4', true);

      service.setSession(header, [designation('D1', ['T1'])]);

      expect(service.selectedTerritoryIds()).toEqual(new Set(['T4']));
    });
  });

  describe('clearSession', () => {
    it('resets header and assigned designations without clearing selection cart', () => {
      service.setTerritorySelection('T4', true);
      service.setSession(header, [designation('D1', ['T1'])]);

      service.clearSession();

      expect(service.header()).toBeNull();
      expect(service.hasActiveSession()).toBe(false);
      expect(service.assignedTerritoryCount()).toBe(0);
      expect(service.selectedTerritoryIds()).toEqual(new Set(['T4']));
    });
  });

  describe('reset', () => {
    it('returns every signal to its initial state', () => {
      service.setTerritorySelection('T1', true);
      service.setHeader(header);
      service.isLoadingSession.set(true);
      service.isCreatingAssignment.set(true);
      service.isStoppingSession.set(true);

      service.reset();

      expect(service.header()).toBeNull();
      expect(service.assignedTerritoryCount()).toBe(0);
      expect(service.selectedCount()).toBe(0);
      expect(service.isLoadingSession()).toBe(false);
      expect(service.isCreatingAssignment()).toBe(false);
      expect(service.isStoppingSession()).toBe(false);
    });
  });
});
