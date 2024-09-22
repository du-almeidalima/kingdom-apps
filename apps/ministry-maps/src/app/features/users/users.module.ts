import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { UsersRoutesModule } from './users-routes.module';
import { UsersPageComponent } from './pages/users-page/users-page.component';
import { UserListItemComponent } from './components/user-list-item/user-list-item.component';
import { AuthorizeDirective } from '../../../../../../libs/common-ui/src/lib/directives/authorize/authorize.directive';

@NgModule({
  declarations: [UsersPageComponent],
  imports: [CommonModule, SharedModule, UsersRoutesModule, UserListItemComponent, AuthorizeDirective],
})
export class UsersModule {}
