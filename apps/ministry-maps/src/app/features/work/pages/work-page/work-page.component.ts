import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, concat, debounceTime, Observable, of, retry, Subscription, tap } from 'rxjs';

import { DesignationRepository } from '../../../../repositories/designation.repository';
import { Designation, DesignationTerritory } from '../../../../../models/designation';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { WorkBO } from '../../bo/work.bo';

@Component({
  selector: 'kingdom-apps-work-page',
  templateUrl: './work-page.component.html',
  styleUrls: ['./work-page.component.scss'],
})
export class WorkPageComponent implements OnInit, OnDestroy {
  private designationTerritorySubscription: Subscription | undefined;
  isLoading = false;
  designation: Designation | undefined;
  territories: Designation['territories'] = [];
  doneTerritories: Designation['territories'] = [];
  isDisabled = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly designationRepository: DesignationRepository,
    private readonly territoryRepository: TerritoryRepository,
    private readonly workBO: WorkBO
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    const designationId = this.route.snapshot.paramMap.get('id') ?? '';

    this.designationTerritorySubscription = this.designationRepository
      .getById(designationId)
      .pipe(
        debounceTime(100),
        tap(() => {
          this.isLoading = false;
        })
      )
      .subscribe(designation => {
        if (designation?.territories) {
          this.isDisabled = this.shouldDisableDesignation(designation);

          this.designation = designation;
          this.territories = [];
          this.doneTerritories = [];

          designation.territories.forEach(t => {
            if (t.status === DesignationStatusEnum.PENDING) {
              this.territories.push(t);
            } else {
              this.doneTerritories.push(t);
            }
          });
        }
      });
  }

  ngOnDestroy(): void {
    if (this.designationTerritorySubscription) {
      this.designationTerritorySubscription.unsubscribe();
    }
  }

  handleTerritoryUpdated(designationTerritory: DesignationTerritory) {
    const updatedDesignation = this.workBO.updateDesignationTerritoryObject(this.designation!, designationTerritory);
    const designationTerritoryUpdate$ = this.designationRepository.update(updatedDesignation);

    // Update Territory lastVisit and history
    const { status: _, ...territory } = designationTerritory;
    territory.lastVisit = new Date();

    const territoryUpdate$ = this.territoryRepository.update(territory);
    let visitHistoryUpdate$ = of(undefined) as Observable<void>;

    // Updating also the territory with the new history entry
    if (designationTerritory?.history?.length && designationTerritory?.history?.length >= 1) {
      // TODO: At some point we should limit the amount of history per territory
      visitHistoryUpdate$ = this.territoryRepository.setVisitHistory(
        designationTerritory.id,
        designationTerritory.history[designationTerritory.history.length - 1]
      );
    }

    concat([designationTerritoryUpdate$, territoryUpdate$, visitHistoryUpdate$]).pipe(retry(2));
  }

  handleLastVisitReverted(designationTerritory: DesignationTerritory) {
    if (designationTerritory.status !== DesignationStatusEnum.DONE) {
      throw new Error('Can only revert last visit for a designation that is done');
    }

    if (!this.designation) {
      throw new Error('Can only revert last visit for a designation that is not undefined');
    }

    this.workBO.undoLastVisitChanges(this.designation, designationTerritory)
      .pipe(
        catchError(err => {
          // TODO: Create a component to display errors
          alert('Um erro aconteceu ao reverter visita, por favor tente novamente. Erro: ' + JSON.stringify(err));

          return of(undefined);
        })
      )
      .subscribe(_ => {
        // TODO: Add a success message here
        console.log("Successfully reverted last visit for designation: " + this.designation?.id + " and territory: " + designationTerritory.id + "");
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
