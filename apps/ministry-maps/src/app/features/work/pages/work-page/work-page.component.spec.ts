import { WorkPageComponent } from './work-page.component';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { ActivatedRoute } from '@angular/router';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { defer, of, throwError } from 'rxjs';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { DesignationNotFoundComponent } from '../../components/designation-not-found/designation-not-found.component';
import { Designation, DesignationTerritory } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { WorkBO } from '../../bo/work.bo';

describe('WorkPageComponent', () => {
  // Resets customizations after each test, in our case of `ActivatedRoute`.
  MockInstance.scope();

  beforeEach(() =>
    MockBuilder(WorkPageComponent)
      .mock(ActivatedRoute)
      .provide(MOCK_REPOSITORIES_PROVIDERS)
  );

  it('should create', () => {
    MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
      paramMap: new Map([['id', '12345']]),
    });

    const fixture = MockRender(WorkPageComponent, {
      territory: territoryMockBuilder({}),
    });

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should show the not found screen when the designation no longer exists (e.g. deleted by the TTL policy)', fakeAsync(() => {
    MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
      paramMap: new Map([['id', 'deleted-designation']]),
    });
    TestBed.overrideProvider(DesignationRepository, {
      useValue: { getById: () => of(undefined) },
    });

    const fixture = MockRender(WorkPageComponent);
    tick(200);
    fixture.detectChanges();

    const component = fixture.point.componentInstance as WorkPageComponent;
    expect(component.isNotFound).toBe(true);
    expect(ngMocks.find(fixture, 'kingdom-apps-designation-not-found')).toBeDefined();
  }));

  it('should not show the not found screen while the designation exists', () => {
    MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
      paramMap: new Map([['id', '12345']]),
    });

    const fixture = MockRender(WorkPageComponent);

    const component = fixture.point.componentInstance as WorkPageComponent;
    expect(component.isNotFound).toBe(false);
    expect(ngMocks.findAll(fixture, DesignationNotFoundComponent)).toHaveLength(0);
  });

  describe('handleTerritoryUpdated', () => {
    const designationTerritory: DesignationTerritory = {
      ...territoryMockBuilder({}),
      status: DesignationStatusEnum.DONE,
      history: [
        {
          id: '1699999999999',
          visitOutcome: VisitOutcomeEnum.SPOKE,
          isRevisit: false,
          date: new Date(),
          notes: 'Visita realizada',
        },
      ],
    };

    const designation: Designation = {
      id: '12345',
      congregationId: 'congregation-1',
      territories: [designationTerritory],
      createdAt: new Date(),
      createdBy: 'creator@example.com',
      expiresAt: new Date(Date.now() + 86_400_000),
    };

    /** Registers jest spies via providers — must happen before rendering (MockRender resets the TestBed). */
    function overrideDependencies(update$: import('rxjs').Observable<void>) {
      MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
        paramMap: new Map([['id', '12345']]),
      });

      const designationUpdate = jest.fn().mockReturnValue(update$);
      const territoryUpdate = jest.fn().mockReturnValue(of(undefined));
      const setVisitHistory = jest.fn().mockReturnValue(of(undefined));

      TestBed.overrideProvider(DesignationRepository, {
        useValue: {
          getById: () => of(designation),
          update: designationUpdate,
        },
      });
      TestBed.overrideProvider(TerritoryRepository, {
        useValue: {
          update: territoryUpdate,
          setVisitHistory,
        },
      });
      TestBed.overrideProvider(WorkBO, {
        useValue: {
          updateDesignationTerritoryObject: () => designation,
        },
      });

      return { designationUpdate, territoryUpdate, setVisitHistory };
    }

    function renderComponent(): WorkPageComponent {
      const fixture = MockRender(WorkPageComponent);
      tick(200);
      fixture.detectChanges();

      return fixture.point.componentInstance as WorkPageComponent;
    }

    it('subscribes the sequenced write-back: designation, territory and visit history all fire', fakeAsync(() => {
      const spies = overrideDependencies(of(undefined));
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);

      renderComponent().handleTerritoryUpdated(designationTerritory);

      expect(spies.designationUpdate).toHaveBeenCalledTimes(1);
      expect(spies.territoryUpdate).toHaveBeenCalledTimes(1);
      expect(spies.setVisitHistory).toHaveBeenCalledWith(
        designationTerritory.id,
        expect.objectContaining({
          id: '1699999999999',
          congregationId: designation.congregationId,
          territoryId: designationTerritory.id,
        })
      );
      expect(alertSpy).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    }));

    it('retries the write-back twice and surfaces an alert when it keeps failing', fakeAsync(() => {
      // Lazy failing write: each retry re-subscription re-executes it, like the real datasource.
      let writeAttempts = 0;
      const failing$ = defer(() => {
        writeAttempts++;
        return throwError(() => new Error('boom'));
      });

      const spies = overrideDependencies(failing$);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);

      renderComponent().handleTerritoryUpdated(designationTerritory);

      // Initial attempt + 2 retries of the lazy, re-subscribable write.
      expect(spies.designationUpdate).toHaveBeenCalledTimes(1);
      expect(writeAttempts).toBe(3);
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Um erro aconteceu ao salvar a visita'));

      alertSpy.mockRestore();
    }));
  });
});
