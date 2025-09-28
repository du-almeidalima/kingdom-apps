import { Component, OnInit, ViewChild } from '@angular/core';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { finalize, map, Observable, of, shareReplay } from 'rxjs';
import { Territory } from '../../../../../models/territory';
import {
  AuthorizeDirective,
  FloatingActionButtonComponent,
  green200,
  grey400,
  IconButtonComponent,
  IconComponent,
  SearchInputComponent,
  SelectComponent,
  ToasterService,
  white200,
} from '@kingdom-apps/common-ui';
import { Dialog } from '@angular/cdk/dialog';
import {
  TerritoryDialogData,
  TerritoryManageDialogComponent,
} from '../../components/territory-manage-dialog/territory-manage-dialog.component';
import { TerritoryDeleteDialogComponent } from '../../components/territory-delete-dialog/territory-delete-dialog.component';
import {
  ALL_OPTION,
  territoriesFilterPipe,
  TerritoriesOrderBy,
  TerritoryFilterSettings,
} from '../../../../shared/utils/territories-filter-pipe';
import {
  MoveResolutionActionsEnum,
  TerritoryMoveAlertDialogComponent,
  TerritoryMoveAlertDialogData,
} from '../../components/territory-move-alert-dialog/territory-move-alert-dialog.component';
import { HistoryDialogComponent } from '../../../../shared/components/dialogs';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  TerritoryGenericAlertDialogComponent,
  TerritoryGenericAlertDialogData,
} from '../../components/territory-generic-alert-dialog/territory-generic-alert-dialog.component';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import { FormsModule } from '@angular/forms';
import { TerritoryListItemComponent } from '../../components/territory-list-item/territory-list-item.component';
import { AsyncPipe } from '@angular/common';
import { CdkMenuModule } from '@angular/cdk/menu';
import { RoleEnum } from '../../../../../models/enums/role';
import { TerritoryCsvExporterBO } from '../../bo/territory-csv-exporter/territory-csv-exporter.bo';

@Component({
  selector: 'kingdom-apps-territories-page',
  templateUrl: './territories-page.component.html',
  styleUrls: ['./territories-page.component.scss'],
  imports: [
    SelectComponent,
    FormsModule,
    SearchInputComponent,
    CdkDrag,
    TerritoryListItemComponent,
    AsyncPipe,
    CdkDropList,
    IconButtonComponent,
    CdkDragHandle,
    IconComponent,
    FloatingActionButtonComponent,
    AuthorizeDirective,
    CdkMenuModule,
  ],
  providers: [TerritoryBO, TerritoryCsvExporterBO],
})
export class TerritoriesPageComponent implements OnInit {
  private territories$: Observable<Territory[]> = of([]);

  public readonly green200 = green200;
  public readonly white200 = white200;
  public readonly greyButtonColor = grey400;
  public readonly RoleEnum = RoleEnum;
  public readonly ALL_OPTION = ALL_OPTION;

  public cities: string[] = [];
  public selectedCity = ALL_OPTION;
  public searchTerm?: string | null;
  public isLoading = false;
  public filteredTerritories$: Observable<Territory[]> = of([]);

  @ViewChild(SearchInputComponent)
  searchInputComponent?: SearchInputComponent;

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService,
    private readonly territoryAlertsBO: TerritoryAlertsBO,
    private readonly territoryBO: TerritoryBO,
    private readonly territoryExporterBO: TerritoryCsvExporterBO,
    private readonly toasterService: ToasterService,
    public dialog: Dialog
  ) {}

  ngOnInit(): void {
    this.cities = this.userState.currentUser?.congregation?.cities ?? [];
    // Select First City
    this.selectedCity = this.cities.length >= 0 ? this.cities[0] : this.ALL_OPTION;

    this.getTerritories();
  }

  trackByRepositoryId(item: Territory) {
    // Had to create an identifier for recentHistory and isResolved changes so Angular can understand changes.
    const recentVisitsId = item.recentHistory?.reduce((acc, cur) => acc + (cur.isResolved ? 1 : 0), 0);

    // TODO: Improve this, maybe create a hash based on the properties
    return `${item.id}-${item.icon}-rh${recentVisitsId}-${item.isBibleStudent}`;
  }

  /**
   * Performs the filter with the current search settings properties:
   * <ul>
   *   <li>{@link searchTerm}</li>
   *   <li>{@link selectedCity}</li>
   *   <li>{@link orderBy}</li>
   * </ul>
   */
  filterTerritories() {
    const searchSettings: TerritoryFilterSettings = {
      searchTerm: this.searchTerm,
      city: this.selectedCity,
      orderBy: TerritoriesOrderBy.SAVED_INDEX,
    };

    this.filteredTerritories$ = territoriesFilterPipe(this.territories$, searchSettings);
  }

  handleTerritorySearchTermChange(searchTerm: string | null) {
    this.searchTerm = searchTerm;
    this.filterTerritories();
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity = city;
    this.filterTerritories();
  }

  /**
   * Handle updating the {@link Territory#positionIndex}. It swaps the indexes of both items
   */
  handleTerritoryDrop(event: CdkDragDrop<object>, territories: Territory[]) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    try {
      const territoriesCopy: Territory[] = structuredClone(territories);

      moveItemInArray(territoriesCopy, event.previousIndex, event.currentIndex);

      // Updating all Territories positionIndexes according to their index in the array
      const updatedTerritories: Territory[] = territoriesCopy.map((tCopy, i) => {
        tCopy.positionIndex = i;

        return tCopy;
      });

      // Find all territories that had their positionIndex updated
      const changedTerritories = updatedTerritories.filter((tUpdated) => {
        const originalTerritory = territories.find((t) => t.id === tUpdated.id);

        return originalTerritory && originalTerritory.positionIndex !== tUpdated.positionIndex;
      });

      this.territoryRepository.batchUpdate(changedTerritories);

      // This is for updating the UI instantly, not necessary though
      this.filteredTerritories$ = this.filteredTerritories$.pipe(
        map((t, index) => {
          // Only doing this operation for the first time, otherwise updatedTerritories would override repository emission
          if (index === 0) {
            return updatedTerritories.map((updatedT) => updatedT);
          }

          return t;
        })
      );
    } catch (e) {
      alert(
        `Uma excessão ocorreu quando os territórios [${event.previousIndex} e ${event.previousIndex}] foram movidos!`
      );
    }
  }

  handleOpenManageTerritoryDialog(territory?: Territory) {
    this.dialog.open<object, TerritoryDialogData>(TerritoryManageDialogComponent, {
      data: {
        territory,
        selectedCity: this.selectedCity !== ALL_OPTION ? this.selectedCity : undefined,
        cities: this.userState.currentUser?.congregation?.cities ?? [],
        congregationId: this.userState.currentUser?.congregation?.id ?? '',
      },
    });
  }

  handleRemoveTerritory(territoryId: string) {
    this.dialog.open<object, TerritoryDialogData>(TerritoryDeleteDialogComponent).closed.subscribe((result) => {
      if (result) this.territoryBO.deleteTerritory(territoryId);
    });
  }

  handleResolveMoveAlert(territory: Territory) {
    this.dialog
      .open<MoveResolutionActionsEnum, TerritoryMoveAlertDialogData>(TerritoryMoveAlertDialogComponent, {
        data: {
          history: territory.recentHistory ?? [],
          markAsResolvedCallback: (histories) => {
            return this.territoryAlertsBO.resolveTerritoryHistoryAlert(territory, histories, VisitOutcomeEnum.MOVED);
          },
        },
      })
      .closed.subscribe((action) => {
        if (!action) {
          return;
        }

        switch (action) {
          case MoveResolutionActionsEnum.EDIT_TERRITORY:
            this.handleOpenManageTerritoryDialog(territory);
            break;
          case MoveResolutionActionsEnum.DELETE_TERRITORY:
            this.handleRemoveTerritory(territory.id);
            break;
        }

        // Need to re-fetch manually because it seems Firebase doesn't update changes on an array property
        this.getTerritories();
      });
  }

  handleResolveRevisitAlert(territory: Territory) {
    const revisitTerritoryHistory = territory.recentHistory?.filter((h) => h.isRevisit) ?? [];

    this.dialog
      .open<boolean, TerritoryGenericAlertDialogData>(TerritoryGenericAlertDialogComponent, {
        data: {
          title: 'Revisita',
          message: 'Um ou mais publicadores marcaram que esse território está sendo revisitado: ',
          history: revisitTerritoryHistory,
          markAsResolvedCallback: (histories) => {
            return this.territoryAlertsBO.resolveTerritoryHistoryAlert(territory, histories, VisitOutcomeEnum.REVISIT);
          },
        },
      })
      .closed.subscribe((result) => {
        // Need to re-fetch manually because it seems Firebase doesn't update changes on an array property
        if (result) {
          this.getTerritories();
        }
      });
  }

  handleResolveStopVisitingAlert(territory: Territory) {
    const stopVisitingHistories =
      territory.recentHistory?.filter((h) => {
        return h.visitOutcome === VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN;
      }) ?? [];

    this.dialog
      .open<boolean, TerritoryGenericAlertDialogData>(TerritoryGenericAlertDialogComponent, {
        data: {
          title: 'Parar de Visitar',
          message: 'Um ou mais publicadores marcaram que esse território pediu para não ser visitado: ',
          history: stopVisitingHistories,
          markAsResolvedCallback: (histories) => {
            return this.territoryAlertsBO.resolveTerritoryHistoryAlert(
              territory,
              histories,
              VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN
            );
          },
        },
      })
      .closed.subscribe((result) => {
        // Need to re-fetch manually because it seems Firebase doesn't update changes on an array property
        if (result) {
          this.getTerritories();
        }
      });
  }

  handleOpenHistory(territory: Territory) {
    this.territoryRepository.getTerritoryVisitHistory(territory.id).subscribe((data) => {
      this.dialog.open<HistoryDialogComponent, TerritoryVisitHistory[]>(HistoryDialogComponent, {
        data: data.reverse() ?? [],
      });
    });
  }

  handleExportTerritories() {
    this.territoryExporterBO.export().subscribe(() => {
      this.toasterService.success('Territórios exportados com sucesso.');
    });
  }

  /** Get territories from the repository and create the filtered observable array */
  private getTerritories() {
    const userCongregationId = this.userState.currentUser?.congregation?.id;
    this.isLoading = true;

    this.territories$ = this.territoryRepository.getAllByCongregation(userCongregationId ?? '').pipe(
      finalize(() => {
        this.isLoading = false;
      }),
      shareReplay(1)
    );

    this.filterTerritories();
  }
}
