import { Component, OnInit } from '@angular/core';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';

@Component({
  selector: 'kingdom-apps-territories-page',
  templateUrl: './territories-page.component.html',
  styleUrls: ['./territories-page.component.scss'],
})
export class TerritoriesPageComponent implements OnInit {
  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService
  ) {}

  ngOnInit(): void {
    const userCongregationId = this.userState.currentUser?.congregation?.id;

    this.territoryRepository.getAllByCongregation(userCongregationId ?? '').subscribe(test => {
      console.log(test);
    });
  }
}
