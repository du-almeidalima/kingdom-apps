import { Component, inject, OnInit } from '@angular/core';
import { HearingTerritoryRepository } from '../../../../repositories/hearing-territory.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { HearingTerritory } from '../../../../../models/hearing-territory';
import { HearingDesignationRepository } from '../../../../repositories/hearing-designation.repository';

@Component({
  selector: 'kingdom-apps-hearing-assign-territories-page',
  templateUrl: './hearing-assign-territories-page.component.html',
  styleUrl: './hearing-assign-territories-page.component.scss',
})
export class HearingAssignTerritoriesPageComponent implements OnInit {

  private readonly hearingDesignationRepository = inject(HearingDesignationRepository);
  private readonly hearingTerritoryRepository = inject(HearingTerritoryRepository);
  private readonly userState = inject(UserStateService);

  territories: HearingTerritory[] = [];

  ngOnInit(): void {
    if (!this.userState.currentUser?.congregation) {
      return;
    }

    // TODO: DELETE ME
    this.hearingDesignationRepository.getById(
      '4O8GvQnq7BY0JZffTf9B'
    ).subscribe(res => {
      if (res) {
        this.territories = res.territories;
      }
    })
  }
}
