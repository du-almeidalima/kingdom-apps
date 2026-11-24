import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TERRITORY_SORT_FILTER_CONFIG } from '../../config/territory-filter.config';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { map, Observable, of, shareReplay, Subscription } from 'rxjs';
import { Territory } from '../../../../../models/territory';
import {
  AuthorizeDirective,
  FloatingActionButtonComponent,
  IconButtonComponent,
  IconComponent,
  SearchInputComponent,
  SortFilterComponent,
  SortFilterValue,
  SpinnerComponent,
  ToasterService,
} from '@kingdom-apps/common-ui';
import { CitySelectComponent } from '../../../../shared/components/city-select/city-select.component';
import { CityLocatorService } from '../../../../shared/services/city-locator/city-locator.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CitySelectComponent,
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
    SortFilterComponent,
    SpinnerComponent,
  ],
  providers: [TerritoryBO, TerritoryCsvExporterBO],
})
export class TerritoriesPageComponent implements OnInit {
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly userState = inject(UserStateService);
  private readonly cityLocatorService = inject(CityLocatorService);
  private readonly territoryAlertsBO = inject(TerritoryAlertsBO);
  private readonly territoryBO = inject(TerritoryBO);
  private readonly territoryExporterBO = inject(TerritoryCsvExporterBO);
  private readonly toasterService = inject(ToasterService);
  private readonly destroyRef = inject(DestroyRef);
  dialog = inject(Dialog);

  private territories$: Observable<Territory[]> = of([]);
  private territoriesSubscription?: Subscription;

  protected readonly RoleEnum = RoleEnum;
  protected readonly ALL_OPTION = ALL_OPTION;
  protected readonly TerritoriesOrderBy = TerritoriesOrderBy;

  public cities: string[] = [];
  public selectedCity = signal<string>(ALL_OPTION);
  private hasFetchedInitial = false;
  public searchTerm?: string | null;
  public searchFilters: TerritoryFilterSettings['filters'] = TERRITORY_SORT_FILTER_CONFIG.filterConfigs.initial;
  public sortBy = TerritoriesOrderBy.SAVED_INDEX;
  private readonly isFetchingTerritories = signal(false);
  public readonly isLoading = computed(
    () =>
      this.isFetchingTerritories() ||
      this.cityLocatorService.isLoading() ||
      this.cityLocatorService.resolvedCity() === null,
  );
  public filteredTerritories$: Observable<Territory[]> = of([]);

  public sortFilterConfig = TERRITORY_SORT_FILTER_CONFIG;

  constructor() {
    effect(() => {
      const city = this.cityLocatorService.resolvedCity();
      if (city === null || this.cityLocatorService.isLoading() || this.hasFetchedInitial) {
        return;
      }

      this.hasFetchedInitial = true;
      this.selectedCity.set(city);
      this.getTerritories();
    });
  }

  ngOnInit(): void {
    this.cities = this.userState.currentUser?.congregation?.cities ?? [];
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
      city: this.selectedCity(),
      orderBy: this.sortBy as TerritoriesOrderBy,
      filters: {
        includeBibleStudent: this.searchFilters?.includeBibleStudent,
        includeMoved: this.searchFilters?.includeMoved,
        icon: this.searchFilters?.icon,
      },
    };

    this.filteredTerritories$ = territoriesFilterPipe(this.territories$, searchSettings);
  }

  handleTerritorySearchTermChange(searchTerm: string | null) {
    this.searchTerm = searchTerm;
    this.filterTerritories();
  }

  handleSortFilterChange(value: SortFilterValue) {
    this.searchFilters = (value.filters ?? {}) as TerritoryFilterSettings['filters'];
    this.sortBy = value.sort as TerritoriesOrderBy;
    this.filterTerritories();
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity.set(city);
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

      if (changedTerritories.length > 0) {
        this.territoryBO.batchUpdateTerritories(changedTerritories).subscribe();
      }

      // This is for updating the UI instantly, not necessary though
      this.filteredTerritories$ = this.filteredTerritories$.pipe(
        map((t, index) => {
          // Only doing this operation for the first time, otherwise updatedTerritories would override repository emission
          if (index === 0) {
            return updatedTerritories.map((updatedT) => updatedT);
          }

          return t;
        }),
      );
    } catch {
      alert(
        `Uma excessão ocorreu quando os territórios [${event.previousIndex} e ${event.currentIndex}] foram movidos!`,
      );
    }
  }

  handleOpenManageTerritoryDialog(territory?: Territory) {
    this.dialog.open<object, TerritoryDialogData>(TerritoryManageDialogComponent, {
      data: {
        territory,
        selectedCity: this.selectedCity() !== ALL_OPTION ? this.selectedCity() : undefined,
        cities: this.userState.currentUser?.congregation?.cities ?? [],
        congregationId: this.userState.currentUser?.congregation?.id ?? '',
      },
    });
  }

  handleRemoveTerritory(territoryId: string) {
    this.dialog.open<object, TerritoryDialogData>(TerritoryDeleteDialogComponent).closed.subscribe((result) => {
      if (result) this.territoryBO.deleteTerritory(territoryId).subscribe();
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
              VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN,
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
    this.territoriesSubscription?.unsubscribe();
    this.isFetchingTerritories.set(true);

    this.territories$ = this.territoryRepository
      .getAllByCongregation(userCongregationId ?? '')
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.territoriesSubscription = this.territories$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.isFetchingTerritories.set(false),
      error: () => this.isFetchingTerritories.set(false),
      complete: () => this.isFetchingTerritories.set(false),
    });

    this.filterTerritories();
  }
}
