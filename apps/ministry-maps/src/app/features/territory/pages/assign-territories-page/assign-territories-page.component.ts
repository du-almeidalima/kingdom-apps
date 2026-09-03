import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable, of, shareReplay } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  FloatingActionButtonComponent,
  IconComponent,
  SearchInputComponent,
  SelectComponent,
  SortFilterComponent,
  SortFilterValue,
  ToasterService,
  white200,
} from '@kingdom-apps/common-ui';

import { Territory } from '../../../../../models/territory';
import { User } from '../../../../../models/user';
import { TERRITORY_SORT_FILTER_CONFIG } from '../../config/territory-filter.config';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { isMobileDevice } from '../../../../shared/utils/user-agent';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Dialog } from '@angular/cdk/dialog';
import {
  ALL_OPTION,
  territoriesFilterPipe,
  TerritoriesOrderBy,
  TerritoryFilterSettings,
} from '../../../../shared/utils/territories-filter-pipe';
import { createSendWhatsAppLink } from '../../../../shared/utils/share-utils';
import { FormsModule } from '@angular/forms';
import { TerritoryCheckboxComponent } from '../../components/territory-checkbox/territory-checkbox.component';
import { AsyncPipe } from '@angular/common';
import { AssignTerritoriesStateService } from '../../state/assign-territories.state.service';
import { DesignationsHeaderBO } from '../../bo/designations-header/designations-header.bo';

@Component({
  selector: 'kingdom-apps-assign-territories-page',
  templateUrl: './assign-territories-page.component.html',
  styleUrls: ['./assign-territories-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SelectComponent,
    FormsModule,
    SearchInputComponent,
    TerritoryCheckboxComponent,
    AsyncPipe,
    FloatingActionButtonComponent,
    IconComponent,
    SortFilterComponent,
  ],
})
export class AssignTerritoriesPageComponent implements OnInit {
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly userState = inject(UserStateService);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(ToasterService);
  private readonly designationsHeaderBO = inject(DesignationsHeaderBO);
  private readonly destroyRef = inject(DestroyRef);

  /** Navigation-surviving session + cart state. */
  public readonly state = inject(AssignTerritoriesStateService);

  public readonly ALL_OPTION = ALL_OPTION;
  public readonly sortFilterConfig = TERRITORY_SORT_FILTER_CONFIG;
  public readonly white200 = white200;

  private territories$: Observable<Territory[]> = of([]);

  cities: string[] = [];
  selectedCity = '';
  searchTerm?: string | null;
  searchFilters: TerritoryFilterSettings['filters'] = TERRITORY_SORT_FILTER_CONFIG.filterConfigs.initial;
  orderBy: TerritoriesOrderBy = TerritoriesOrderBy.SAVED_INDEX;
  filteredTerritories$: Observable<Territory[]> = of([]);

  searchInputComponent = viewChild.required(SearchInputComponent);

  /**
   * This page is only reachable for a signed-in user whose congregation reference is resolved,
   * so the state values are asserted here instead of guarded at every call site.
   */
  private get currentCongregation(): NonNullable<User['congregation']> {
    const user = this.userState.currentUser;
    if (!user?.congregation) {
      throw new Error('Assign Territories requires a signed-in user with a resolved congregation.');
    }
    return user.congregation;
  }

  ngOnInit(): void {
    const { id, cities } = this.currentCongregation;
    const firstCity = cities.length > 0 ? cities[0] : ALL_OPTION;

    this.selectedCity = firstCity;
    this.cities = cities;

    this.fetchTerritories(id, firstCity);

    this.state.isLoadingSession.set(true);
    this.designationsHeaderBO
      .getActiveSessionStream(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ header, designations }) => {
          this.state.setSession(header, designations);
          this.state.isLoadingSession.set(false);
        },
        error: () => {
          this.state.isLoadingSession.set(false);
        },
      });
  }

  /**
   * Returns true if the territory has already been selected (checks the checkbox).
   * It checks both the currently selected list or if it was already assigned to a designation.
   * i.e. it's in the assignedDesignations map.
   * @param territoryId
   */
  hasAlreadyBeenSelected(territoryId: string): boolean {
    return this.state.selectedTerritoryIds().has(territoryId) || this.isTerritoryAssigned(territoryId);
  }

  /** Returns true if the territory was already assigned to a designation created in this session. */
  isTerritoryAssigned(territoryId: string): boolean {
    return this.state.assignedTerritoryIndex().has(territoryId);
  }

  /** Returns the id of the designation the territory was assigned to, if any. */
  designationIdForTerritory(territoryId: string): string | undefined {
    return this.state.assignedTerritoryIndex().get(territoryId);
  }

  /**
   * Re-triggers the sharing mechanism for the designation a territory was assigned to.
   * Called when the user taps an already-assigned (disabled) territory row.
   */
  handleAssignedTerritoryClick(territoryId: string) {
    const designationId = this.designationIdForTerritory(territoryId);

    if (designationId) {
      this.shareDesignation(designationId);
    }
  }

  handleTerritoryFormSubmit() {
    // Guards against a double submission
    if (this.state.isCreatingAssignment() || !this.state.selectedCount()) {
      return;
    }

    const territoryIds = Array.from(this.state.selectedTerritoryIds());
    this.state.isCreatingAssignment.set(true);

    this.designationsHeaderBO
      .createDesignation(territoryIds, this.state.header())
      .pipe(finalize(() => this.state.isCreatingAssignment.set(false)))
      .subscribe(({ designation, header }) => {
        this.state.setHeader(header);
        this.state.addAssignedDesignation(designation.id, territoryIds);
        this.shareDesignation(designation.id);
      });
  }

  /** Opens the Stop confirmation dialog and, on confirmation, closes the active session. */
  handleStopClick() {
    this.openConfirmStopDialog().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      const header = this.state.header();
      if (!header) {
        return;
      }

      this.state.isStoppingSession.set(true);
      this.designationsHeaderBO
        .closeHeader(header.id)
        .pipe(finalize(() => this.state.isStoppingSession.set(false)))
        .subscribe({
          next: () => {
            this.state.clearSession();
            this.toaster.success('Designações em andamento encerradas com sucesso.');
          },
        });
    });
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
      orderBy: this.orderBy,
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
    this.orderBy = (value.sort as TerritoriesOrderBy) ?? TerritoriesOrderBy.SAVED_INDEX;
    this.filterTerritories();
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity = city;
    this.searchTerm = '';
    this.searchInputComponent().resetSearch();
    this.fetchTerritories(this.currentCongregation.id, city);
  }

  handleTerritoryCheck(value: boolean, territory: Territory) {
    const territoryId = territory.id;

    const importantAlert = TerritoryAlertsBO.findImportantAlert(territory);

    // Adding the value here regardless of the alert because we need to tell Angular that something has changed
    // In order for the TerritoryCheckBox component to render correctly
    // Otherwise, even by not adding this, the TerritoryCheckBox would display as selected
    this.state.setTerritorySelection(territoryId, value);

    if (value && importantAlert) {
      this.openConfirmAssignmentDialog(importantAlert).subscribe((result) => {
        if (!result) {
          this.state.setTerritorySelection(territoryId, false);
        }
      });
    }
  }

  shareDesignation(designationId: string) {
    const builtUrl = createSendWhatsAppLink(`${location.origin}/${FeatureRoutesEnum.WORK}/${designationId}`);

    if (isMobileDevice()) {
      window.location.href = builtUrl;
    } else {
      window.open(builtUrl);
    }
  }

  private fetchTerritories(congregationId: string, city: string) {
    // This is the object that will be iterated, since we can't iterate through formGroup.controls...
    this.territories$ =
      city === ALL_OPTION
        ? this.territoryRepository.getAllByCongregation(congregationId).pipe(shareReplay(1))
        : this.territoryRepository.getAllByCongregationAndCities(congregationId, [city]).pipe(shareReplay(1));

    this.filterTerritories();
  }

  private openConfirmAssignmentDialog(importantAlert: VisitOutcomeEnum) {
    const { title, bodyText } = TerritoryAlertsBO.alertMessaging(importantAlert);

    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: { title, bodyText },
    }).closed;
  }

  private openConfirmStopDialog() {
    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: {
        title: 'Encerrar designações?',
        bodyText: 'Os territórios já designados serão mantidos. Novas designações iniciarão um novo ciclo.',
      },
    }).closed;
  }
}
