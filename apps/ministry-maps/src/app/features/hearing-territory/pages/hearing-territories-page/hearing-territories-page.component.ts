import { Component, inject, OnInit } from '@angular/core';
import { HearingTerritoryRepository } from '../../../../repositories/hearing-territory.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { HearingTerritory } from '../../../../../models/hearing-territory';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'kingdom-apps-hearing-territories-page',
  templateUrl: './hearing-territories-page.component.html',
  styleUrl: './hearing-territories-page.component.scss',
})
export class HearingTerritoriesPageComponent implements OnInit {
  private readonly hearingTerritoryRepository = inject(HearingTerritoryRepository);
  private readonly userState = inject(UserStateService);

  territories$: Observable<HearingTerritory[]> = of([]);

  ngOnInit(): void {
    if (!this.userState.currentUser?.congregation) {
      return;
    }

    this.territories$ = this.hearingTerritoryRepository.getAllByCongregation(
      this.userState.currentUser.congregation.id
    );
  }
}
