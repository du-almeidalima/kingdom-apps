import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { grey400, Icons, primaryGreen } from '@kingdom-apps/common';

import { Territory, TerritoryIcon } from '../../../../../models/territory';

@Component({
  selector: 'kingdom-apps-work-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item.component.scss'],
  template: `
    <div class="work-item">
      <!-- Checkbox -->
      <label class="work-item__checkbox-container" title="Concluir visita" [for]="territory.id">
        <input class="work-item__checkbox" type="checkbox" [id]="territory.id" />
      </label>
      <!-- Content -->
      <div class="work-item__container">
        <div class="work-item__icon-container">
          <lib-icon class="work-item__icon" [fillColor]="iconColor" [icon]="icon"></lib-icon>
        </div>
        <div class="work-item__address-container">
          <h3 class="work-item__address-street">{{ territory.address }}</h3>
          <span class="work-item__address-city">{{ territory.city }}</span>
        </div>
        <div class="work-item__buttons-container">
          <button class="work-item__button">
            <lib-icon [fillColor]="buttonIconColor" icon="time-17"></lib-icon>
          </button>
          <button class="work-item__button">
            <lib-icon [fillColor]="buttonIconColor" icon="map-5"></lib-icon>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class WorkItemComponent implements OnInit {
  public buttonIconColor = primaryGreen;
  public iconColor = grey400;
  public icon: Icons = 'generation-3';

  @Input()
  territory!: Territory;

  ngOnInit(): void {
    this.icon = this.territoryIconToIcon(this.territory.icon);
  }

  territoryIconToIcon(territoryIcon: TerritoryIcon): Icons {
    switch (territoryIcon) {
      case TerritoryIcon.MAN:
        return 'generation-3';
      case TerritoryIcon.WOMAN:
        return 'generation-12';
      default:
        return 'generation-3';
    }
  }
}
