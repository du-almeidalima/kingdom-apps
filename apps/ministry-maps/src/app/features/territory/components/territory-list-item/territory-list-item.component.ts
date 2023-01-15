import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Territory } from '../../../../../models/territory';

@Component({
  selector: 'kingdom-apps-territory-list-item',
  styleUrls: ['./territory-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-card>
      <lib-card-body>
        <h3 class="t-headline3">{{ territory.address }}</h3>
        <p class="t-body1">{{ territory.city }}</p>

        <button lib-button (click)="edit.emit(territory)">Editar</button>
        <button lib-button (click)="remove.emit(territory.id)">Excluir</button>
      </lib-card-body>
    </lib-card>
  `,
})
export class TerritoryListItemComponent {
  @Input()
  territory!: Territory;

  @Output()
  edit = new EventEmitter<Territory>();

  @Output()
  remove = new EventEmitter<string>();
}
