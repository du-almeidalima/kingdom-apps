import { ChangeDetectionStrategy, Component, computed, EventEmitter, input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonComponentsModule, grey400, IconComponent, red300 } from '@kingdom-apps/common-ui';

import { User } from '../../../../models/user';
import { getUserInitials } from '../../../shared/utils/user-utils';
import { getTranslatedRole, RoleEnum } from '../../../../models/enums/role';
import {
  CommonDirectivesModule
} from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-user-list-item',
  standalone: true,
  styleUrl: './user-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CdkMenu, CdkMenuItem, CommonComponentsModule, IconComponent, CdkMenuTrigger, CommonDirectivesModule],
  template: `
    <div class='user-item'>
      <!-- INITIALS -->
      <figure class='user-initials-figure'>
        <figcaption>{{ initials() }}</figcaption>
      </figure>
      <!-- TITLE -->
      <div class='user-item__content'>
        <div class='user-item__title-content'>
          <h2 class='t-headline4 t-medium-emphasis'>{{ this.user().name }}</h2>
          <span class='user-item__privilege-badge'
                [ngClass]="'user-item__privilege-badge--' + user().role.toLowerCase()"
          >
            {{ role() }}
          </span>
        </div>

        <!-- VERTICAL MENU -->
        <button lib-icon-button [cdkMenuTriggerFor]='menu' type='button' *lib-authorize="[RoleEnum.APP_ADMIN, RoleEnum.SUPERINTENDENT, RoleEnum.ADMIN]">
          <lib-icon [fillColor]='greyButtonColor' icon='menu-dot-vertical-filled'></lib-icon>
        </button>

        <ng-template #menu>
          <menu class='menu' cdkMenu>
            <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='edit.emit(user())'>
              <button lib-icon-button type='button'>
                <lib-icon [fillColor]='greyButtonColor' icon='pencil-lined'></lib-icon>
              </button>
              <span>Editar</span>
            </li>
            <!-- SEPARATOR -->
            <hr class='menu__separator'>
            <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='remove.emit(user().id)'>
              <button lib-icon-button cdkMenuItem type='button'>
                <lib-icon [fillColor]='deleteButtonColor' icon='trash-can-lined'></lib-icon>
              </button>
              <span class='text-red-500'>Apagar</span>
            </li>
          </menu>
        </ng-template>
      </div>
    </div>
  `,
})
export class UserListItemComponent {
  protected readonly RoleEnum = RoleEnum;

  protected readonly deleteButtonColor = red300;
  protected readonly greyButtonColor = grey400;

  user = input.required<User>();
  initials = computed(() => getUserInitials(this.user().name));
  role = computed(() => getTranslatedRole(this.user()?.role ?? RoleEnum.PUBLISHER));

  @Output()
  edit = new EventEmitter<User>();

  @Output()
  remove = new EventEmitter<string>();
}
