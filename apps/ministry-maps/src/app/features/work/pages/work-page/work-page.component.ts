import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { tap } from 'rxjs';

import { DesignationRepository } from '../../../../repositories/designation.repository';
import { Designation, DesignationTerritory } from '../../../../../models/designation';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';

@Component({
  selector: 'kingdom-apps-work-page',
  templateUrl: './work-page.component.html',
  styleUrls: ['./work-page.component.scss'],
})
export class WorkPageComponent implements OnInit {
  isLoading = false;
  designation: Designation | undefined;
  territories: Designation['territories'] = [];
  doneTerritories: Designation['territories'] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly designationRepository: DesignationRepository,
    private readonly territoryRepository: TerritoryRepository
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    const designationId = this.route.snapshot.paramMap.get('id') ?? '';

    this.designationRepository
      .getById(designationId)
      .pipe(
        tap(() => {
          this.isLoading = false;
        })
      )
      .subscribe(designation => {
        if (designation?.territories) {
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

  updateWorkItem(designationTerritory: DesignationTerritory) {
    // Manually mutating the designations territories so order is preserved. Maybe it should be collection?
    const designationTerritories = [...this.designation!.territories];
    const updatedDesignationsTerritory = designationTerritories.map(t => {
      return t.id === designationTerritory.id
        ? {
            ...designationTerritory,
          }
        : t;
    });
    const updatedDesignation: Designation = {
      ...this.designation!,
      territories: updatedDesignationsTerritory,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status, ...territory } = designationTerritory;
    territory.lastVisit = new Date();

    this.designationRepository.update(updatedDesignation);

    // Updating also the territory with the new history entry
    if (designationTerritory.history) {
      this.territoryRepository.addVisitHistory(
        designationTerritory.id,
        designationTerritory.history[designationTerritory.history.length - 1]
      );
    }

    this.territoryRepository.update(territory);
  }
}
