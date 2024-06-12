import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeatureRoutesEnum } from '../../../../app-routes.module';
import { TerritoryRoutesEnum } from '../../../territory/territory-routes.module';
import { UserStateService } from '../../../../state/user.state.service';
import { UsersRoutesEnum } from '../../../users/users-routes.module';

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

  get userName(): string {
    const userNames = this.userState.currentUser!.name.split(' ');

    return userNames ? userNames[0] : this.userState.currentUser?.name ?? '';
  }

  protected readonly UsersRoutesEnum = UsersRoutesEnum;
}
