import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeatureRoutesEnum } from '../../../../app-routes.module';
import { TerritoryRoutesEnum } from '../../../territory/territory-routes.module';
import { UserStateService } from '../../../../state/user.state.service';

@Component({
  selector: 'kingdom-apps-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  public readonly TerritoryRoutes = TerritoryRoutesEnum;
  public readonly FeatureRoutes = FeatureRoutesEnum;

  constructor(public readonly userState: UserStateService) {}
}
