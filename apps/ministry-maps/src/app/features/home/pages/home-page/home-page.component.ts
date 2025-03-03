import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { TerritoryRoutesEnum } from '../../../territory/territory-routes.module';
import { UserStateService } from '../../../../state/user.state.service';
import { UsersRoutesEnum } from '../../../users/users-routes.module';
import { RouterLink } from '@angular/router';
import { CardBodyComponent, CardComponent, CardHeaderComponent } from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CardBodyComponent, CardComponent, CardHeaderComponent],
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
