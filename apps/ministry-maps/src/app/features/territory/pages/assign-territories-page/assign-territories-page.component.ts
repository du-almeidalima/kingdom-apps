import { Component, OnInit, ViewChild } from '@angular/core';
import { finalize, Observable, of, shareReplay, take, tap } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  FloatingActionButtonComponent,
  green200,
  IconComponent,
  SearchInputComponent,
  SelectComponent,
  SortFilterComponent,
  SortFilterValue,
  white200,
} from '@kingdom-apps/common-ui';

import { Territory } from '../../../../../models/territory';
import { TERRITORY_SORT_FILTER_CONFIG } from '../../config/territory-filter.config';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { isMobileDevice } from '../../../../shared/utils/user-agent';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Dialog } from '@angular/cdk/dialog';
import { TerritoryBO } from '../../bo/territory/territory.bo';
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
import { TeamDistributionService, DistributionPlan, CarPlan } from '../../services/team-distribution.service';
import { suggestCapacity, selectionStatus, SelectionStatus } from '../../services/capacity';
import { formGroups, describeGroups, groupMakeup } from '../../services/pairing';

/** Fallback average leg (km) used for the capacity suggestion before a route is computed. */
const DEFAULT_AVG_LEG_KM = 2;

@Component({
  selector: 'kingdom-apps-assign-territories-page',
  templateUrl: './assign-territories-page.component.html',
  styleUrls: ['./assign-territories-page.component.scss'],
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
  private territories$: Observable<Territory[]> = of([]);

  public readonly ALL_OPTION = ALL_OPTION;
  public readonly green200 = green200;
  public readonly white200 = white200;

  isCreatingAssignment = false;
  cities: string[] = [];
  selectedCity = '';
  searchTerm?: string | null;
  searchFilters: TerritoryFilterSettings['filters'] = TERRITORY_SORT_FILTER_CONFIG.filterConfigs?.initial;
  orderBy: TerritoriesOrderBy = TerritoriesOrderBy.SAVED_INDEX;
  filteredTerritories$: Observable<Territory[]> = of([]);
  selectedTerritoriesModel = new Set<string>();
  assignedTerritories = new Set<string>();

  // Route optimization + team distribution state
  private territoryById = new Map<string, Territory>();
  private orderIndexById = new Map<string, number>(); // territory id -> 1-based global route position
  private carIndexById = new Map<string, number>(); // territory id -> 0-based car
  optimizedOrder: string[] = []; // full route order (all cars flattened) for the "send all" FAB
  plan: DistributionPlan | null = null; // per-car distribution after "Distribuir"
  suggestion: { perPair: number; suggestedTotal: number } | null = null;
  selectionState: SelectionStatus = 'under';
  isSharingCar: number | null = null;
  // Cached crew composition (recomputed only on team/selection change, not every CD cycle).
  numGroups = 0;
  groupText = '';
  groupUnplaced = 0;
  team = { men: 0, women: 0, cars: 0, durationMin: 120, economize: true };
  /** Average minutes spent per visit. */
  private readonly visitMin = 10;

  readonly CAR_COLORS = ['#45c06c', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16'];
  readonly describeGroups = describeGroups;
  readonly groupMakeup = groupMakeup;

  public sortFilterConfig = TERRITORY_SORT_FILTER_CONFIG;

  @ViewChild(SearchInputComponent)
  searchInputComponent!: SearchInputComponent;

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService,
    private readonly territoryBO: TerritoryBO,
    private readonly dialog: Dialog,
    private readonly distribution: TeamDistributionService
  ) {}

  ngOnInit(): void {
    const { id, cities } = this.userState.currentUser!.congregation!;
    const firstCity = cities.length >= 0 ? cities[0] : ALL_OPTION;

    this.selectedCity = firstCity;
    this.cities = cities;

    this.fetchTerritories(id, firstCity);
    this.recomputeSuggestion();
  }

  /**
   * Returns true if the territory has already been selected (checks the checkbox).
   * It checks both the currently selected list or if it was already assigned to a designation.
   * i.e. it's in the assignedTerritories Set.
   * @param territoryId
   */
  hasAlreadyBeenSelected(territoryId: string): boolean {
    return this.selectedTerritoriesModel.has(territoryId) || this.assignedTerritories.has(territoryId);
  }

  handleTerritoryFormSubmit() {
    this.assignedTerritories = new Set([...this.selectedTerritoriesModel, ...this.assignedTerritories]);
    // Use the optimized route order when it covers exactly the current selection; otherwise selection order.
    const selectionIds = [...this.selectedTerritoriesModel.values()];
    const selectedTerritories =
      this.optimizedOrder.length === selectionIds.length &&
      selectionIds.every(id => this.optimizedOrder.includes(id))
        ? this.optimizedOrder
        : selectionIds;
    this.selectedTerritoriesModel.clear();
    this.invalidatePlan();

    // Loading Spinner on Button
    this.isCreatingAssignment = true;

    this.territoryBO
      .createDesignationForTerritories(selectedTerritories)
      .pipe(
        finalize(() => {
          this.isCreatingAssignment = false;
        })
      )
      .subscribe((designation) => {
        this.shareDesignation(designation.id);
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
    this.searchFilters = value.filters ?? {};
    this.orderBy = (value.sort as TerritoriesOrderBy) ?? TerritoriesOrderBy.SAVED_INDEX;
    this.filterTerritories();
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity = city;
    this.searchTerm = '';
    this.searchInputComponent.resetSearch();
    this.fetchTerritories(this.userState.currentUser!.congregation!.id, city);
  }

  handleTerritoryCheck(value: boolean, territory: Territory) {
    const territoryId = territory.id;

    const importantAlert = TerritoryAlertsBO.findImportantAlert(territory);

    // Adding the value here regardless of the alert because we need to tell Angular that something has changed
    // In order for the TerritoryCheckBox component to render correctly
    // Otherwise, even by not adding this, the TerritoryCheckBox would display as selected
    if (value) {
      this.selectedTerritoriesModel.add(territoryId);
    } else {
      this.selectedTerritoriesModel.delete(territoryId);
    }

    // Any selection change invalidates a previously computed distribution.
    this.invalidatePlan();
    this.recomputeSuggestion();

    if (value && importantAlert) {
      this.openConfirmAssignmentDialog(importantAlert).subscribe((result) => {
        if (!result) {
          this.selectedTerritoriesModel.delete(territoryId);
        }
      });
    }
  }

  /**
   * Forms work groups (pairs/trios) from the crew, optimizes the selected territories,
   * and distributes them into per-car clusters. Runs synchronously from loaded territories.
   */
  handleDistribute() {
    const ids = [...this.selectedTerritoriesModel.values()];
    if (ids.length < 2 || this.numGroups < 1) {
      return; // need at least 2 territories and a crew that forms at least one pair/trio
    }

    const selected = ids
      .map(id => this.territoryById.get(id))
      .filter((t): t is Territory => !!t);

    const plan = this.distribution.distribute(selected, {
      men: this.team.men,
      women: this.team.women,
      cars: this.team.cars,
      visitMin: this.visitMin,
      durationMin: this.team.durationMin,
      economize: this.team.economize,
    });
    this.plan = plan;

    // Build the global route order + per-car maps for the numbered, colored preview.
    this.orderIndexById.clear();
    this.carIndexById.clear();
    const flat: string[] = [];
    plan.cars.forEach(car => {
      car.territories.forEach(t => {
        flat.push(t.id);
        this.orderIndexById.set(t.id, flat.length);
        this.carIndexById.set(t.id, car.carIndex);
      });
    });
    this.optimizedOrder = flat;
    this.recomputeSuggestion();
  }

  /** Re-run the distribution when the economize toggle flips (if a plan is showing). */
  onEconomizeChange() {
    if (this.plan) {
      this.handleDistribute();
    }
  }

  /**
   * One-click distribution: auto-select the most-overdue territories (ordered by last
   * visit) up to the suggested count for the current team, then optimize + distribute.
   * Pool is the loaded territories for the active city (or all cities when "Todas").
   */
  handleAutoDistribute() {
    this.recomputeSuggestion();
    const target = this.suggestion?.suggestedTotal ?? 0;
    if (target < 2) {
      return;
    }

    // Pool = the territories currently VISIBLE (same city + filters the user sees), so the
    // auto-selection matches what gets badged and never picks filtered-out ones (e.g. bible students).
    this.filteredTerritories$.pipe(take(1)).subscribe(list => {
      const stalest = [...list]
        .filter(t => !this.assignedTerritories.has(t.id))
        .sort((a, b) => (a.lastVisit?.getTime() ?? 0) - (b.lastVisit?.getTime() ?? 0)); // stalest first

      // Pass 1: distribute the default-estimate count to learn the real average leg.
      this.selectedTerritoriesModel = new Set(stalest.slice(0, target).map(t => t.id));
      this.handleDistribute();

      // Pass 2: the suggestion just refined using the real travel - if fewer territories
      // actually fit the time budget, trim to that and redistribute so pairs stay in budget.
      const refined = this.suggestion?.suggestedTotal ?? target;
      if (refined >= 2 && refined < target) {
        this.selectedTerritoriesModel = new Set(stalest.slice(0, refined).map(t => t.id));
        this.handleDistribute();
      }
    });
  }

  recomputeSuggestion() {
    // Compute the crew composition ONCE and cache it (the template reads the cached fields
    // instead of calling formGroups on every change-detection cycle).
    const gp = formGroups(this.team.men, this.team.women);
    this.numGroups = gp.groups.length;
    this.groupText = this.describeGroups(gp);
    this.groupUnplaced = gp.unplacedMen + gp.unplacedWomen;
    // Capacity scales with the number of work groups (pairs + trios), not raw headcount.
    const avgLegKm = this.plan ? this.plan.avgLegKm : DEFAULT_AVG_LEG_KM;
    this.suggestion = suggestCapacity({
      pairs: Math.max(1, this.numGroups),
      durationMin: this.team.durationMin,
      avgLegKm,
      visitMin: this.visitMin,
    });
    this.selectionState = selectionStatus(this.selectedTerritoriesModel.size, this.suggestion.suggestedTotal);
  }

  /** Trim the current selection to the suggested total, keeping the stalest (most overdue). */
  trimToSuggested() {
    const target = this.suggestion?.suggestedTotal ?? 0;
    if (!target || this.selectedTerritoriesModel.size <= target) {
      return;
    }
    const kept = [...this.selectedTerritoriesModel.values()]
      .map(id => this.territoryById.get(id))
      .filter((t): t is Territory => !!t)
      .sort((a, b) => (a.lastVisit?.getTime() ?? 0) - (b.lastVisit?.getTime() ?? 0)) // stalest first
      .slice(0, target);
    this.selectedTerritoriesModel = new Set(kept.map(t => t.id));
    this.invalidatePlan();
    this.recomputeSuggestion();
  }

  /** Creates a designation for one car's cluster (in order) and shares it via WhatsApp. */
  shareForCar(car: CarPlan) {
    this.isSharingCar = car.carIndex;
    const ids = car.territories.map(t => t.id);
    this.territoryBO
      .createDesignationForTerritories(ids)
      .pipe(finalize(() => (this.isSharingCar = null)))
      .subscribe(designation => this.shareDesignation(designation.id));
  }

  private invalidatePlan() {
    this.optimizedOrder = [];
    this.plan = null;
    this.orderIndexById.clear();
    this.carIndexById.clear();
  }

  /** 1-based position of a territory id in the optimized route, or null if not distributed yet. */
  orderIndexOf(id: string): number | null {
    return this.orderIndexById.get(id) ?? null;
  }

  /** Color of a territory's assigned car, or null when not distributed. */
  carColorOf(id: string): string | null {
    const c = this.carIndexById.get(id);
    return c === undefined ? null : this.CAR_COLORS[c % this.CAR_COLORS.length];
  }

  carColor(carIndex: number): string {
    return this.CAR_COLORS[carIndex % this.CAR_COLORS.length];
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
    const source$ =
      city === ALL_OPTION
        ? this.territoryRepository.getAllByCongregation(congregationId)
        : this.territoryRepository.getAllByCongregationAndCities(congregationId, [city]);

    // Accumulate every loaded territory so the optimizer can resolve any selected
    // id synchronously (selections can span cities; you can only select what you've loaded).
    this.territories$ = source$.pipe(
      tap(list => list.forEach(t => this.territoryById.set(t.id, t))),
      shareReplay(1)
    );

    this.filterTerritories();
  }

  private openConfirmAssignmentDialog(importantAlert: VisitOutcomeEnum) {
    const { title, bodyText } = TerritoryAlertsBO.alertMessaging(importantAlert);

    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: { title, bodyText },
    }).closed;
  }
}
