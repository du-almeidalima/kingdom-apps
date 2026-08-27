import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, concat, debounceTime, Observable, of, retry, Subscription, tap } from 'rxjs';

import { DesignationRepository } from '../../../../repositories/designation.repository';
import { Designation, DesignationTerritory } from '../../../../../models/designation';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { WorkBO } from '../../bo/work.bo';
import { NoteComponent } from '@kingdom-apps/common-ui';
import { WorkItemComponent } from '../../components/work-item/work-item.component';
import { DesignationNotFoundComponent } from '../../components/designation-not-found/designation-not-found.component';

@Component({
  selector: 'kingdom-apps-work-page',
  templateUrl: './work-page.component.html',
  styleUrls: ['./work-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WorkBO],
  imports: [NoteComponent, WorkItemComponent, DesignationNotFoundComponent],
})
export class WorkPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly designationRepository = inject(DesignationRepository);
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly workBO = inject(WorkBO);

  private designationTerritorySubscription: Subscription | undefined;
  isLoading = signal(false);
  isNotFound = signal(false);
  designation = signal<Designation | undefined>(undefined);
  territories = signal<Designation['territories']>([]);
  doneTerritories = signal<Designation['territories']>([]);
  isDisabled = signal(false);
  isBlocked = signal(false);

  ngOnInit(): void {
    this.isLoading.set(true);
    const designationId = this.route.snapshot.paramMap.get('id') ?? '';

    this.designationTerritorySubscription = this.designationRepository
      .getById(designationId)
      .pipe(
        debounceTime(100),
        tap(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe((designation) => {
        // Designations deleted by the Firestore TTL policy (or otherwise missing) resolve to undefined.
        this.isNotFound.set(!designation);

        if (designation?.territories) {
          this.isDisabled.set(this.shouldDisableDesignation(designation));
          this.isBlocked.set(this.isDisabled() && !!designation.settings?.shouldDesignationBlockAfterExpired);

          this.designation.set(designation);

          const territories: Designation['territories'] = [];
          const doneTerritories: Designation['territories'] = [];

          designation.territories.forEach((t) => {
            if (t.status === DesignationStatusEnum.PENDING) {
              territories.push(t);
            } else {
              doneTerritories.push(t);
            }
          });

          this.territories.set(territories);
          this.doneTerritories.set(doneTerritories);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.designationTerritorySubscription) {
      this.designationTerritorySubscription.unsubscribe();
    }
  }

  handleTerritoryUpdated(designationTerritory: DesignationTerritory) {
    const designation = this.designation();
    if (!designation) {
      return;
    }
    const updatedDesignation = this.workBO.updateDesignationTerritoryObject(designation, designationTerritory);
    const designationTerritoryUpdate$ = this.designationRepository.update(updatedDesignation);

    // Update Territory lastVisit and history
    const { status: _, ...territory } = designationTerritory;
    territory.lastVisit = new Date();

    const territoryUpdate$ = this.territoryRepository.update(territory);
    let visitHistoryUpdate$ = of(undefined) as Observable<void>;

    // Updating also the territory with the new history entry
    if (designationTerritory?.history?.length && designationTerritory?.history?.length >= 1) {
      // TODO: At some point we should limit the amount of history per territory
      const visitEntry = designationTerritory.history[designationTerritory.history.length - 1];
      const stampedVisitEntry = {
        ...visitEntry,
        congregationId: designation.congregationId,
        territoryId: designationTerritory.id,
      };
      visitHistoryUpdate$ = this.territoryRepository.setVisitHistory(designationTerritory.id, stampedVisitEntry);
    }

    // The observables must be spread out: `concat([a$, b$])` would emit them as values and
    // never subscribe the writes.
    concat(designationTerritoryUpdate$, territoryUpdate$, visitHistoryUpdate$)
      .pipe(
        retry(2),
        catchError((err) => {
          // TODO: Create a component to display errors
          alert('Um erro aconteceu ao salvar a visita, por favor tente novamente. Erro: ' + JSON.stringify(err));

          return of(undefined);
        }),
      )
      .subscribe(() => {
        // TODO: Add a success message here
        console.log(
          'Successfully saved visit for designation: ' +
            this.designation()?.id +
            ' and territory: ' +
            designationTerritory.id +
            '',
        );
      });
  }

  handleLastVisitReverted(designationTerritory: DesignationTerritory) {
    if (designationTerritory.status !== DesignationStatusEnum.DONE) {
      throw new Error('Can only revert last visit for a designation that is done');
    }

    const designation = this.designation();

    if (!designation) {
      throw new Error('Can only revert last visit for a designation that is not undefined');
    }

    this.workBO
      .undoLastVisitChanges(designation, designationTerritory)
      .pipe(
        catchError((err) => {
          // TODO: Create a component to display errors
          alert('Um erro aconteceu ao reverter visita, por favor tente novamente. Erro: ' + JSON.stringify(err));

          return of(undefined);
        }),
      )
      .subscribe(() => {
        // TODO: Add a success message here
        console.log(
          'Successfully reverted last visit for designation: ' +
            this.designation()?.id +
            ' and territory: ' +
            designationTerritory.id +
            '',
        );
      });
  }

  /**
   * Checks if this {@link Designation} has expired. <br />
   * Since this is a field that was introduced, even though it's not optional in the {@link Designation} model. For the
   * time being, we'll treat it as an option. After 2 months from this commit, we can remove the undefined checks.
   */
  private shouldDisableDesignation(designation: Designation | undefined) {
    if (designation?.expiresAt) {
      return designation.expiresAt.getTime() < Date.now();
    }

    return false;
  }
}
