import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { TerritoryRoutesEnum } from '../../../territory/models/enums/territory-routes';
import { UserStateService } from '../../../../state/user.state.service';
import { CongregationRoutesEnum } from '../../../congregation/models/enums/congregation-routes';
import { CONGREGATION_ALLOWED_ROLES } from '../../../congregation/config/congregation-roles.config';
import { RouterLink } from '@angular/router';
import { AuthorizeDirective, CardBodyComponent, CardComponent, CardHeaderComponent } from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AuthorizeDirective, CardBodyComponent, CardComponent, CardHeaderComponent],
})
export class HomePageComponent {
  readonly userState = inject(UserStateService);

  public readonly TerritoryRoutes = TerritoryRoutesEnum;
  public readonly FeatureRoutes = FeatureRoutesEnum;
  protected readonly CongregationRoutes = CongregationRoutesEnum;
  protected readonly CONGREGATION_ALLOWED_ROLES = CONGREGATION_ALLOWED_ROLES;

  get userName(): string {
    const userNames = this.userState.currentUser?.name.split(' ');

    return userNames ? userNames[0] : (this.userState.currentUser?.name ?? '');
  }
}
