import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable, of, shareReplay, take, tap } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  SearchInputComponent,
  SelectComponent,
  SortFilterComponent,
  SortFilterValue,
  ToasterService,
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
import { AssignTerritoriesDockComponent } from '../../components/assign-territories-dock/assign-territories-dock.component';
import { TeamDistributionService, DistributionPlan, CarPlan } from '../../services/team-distribution.service';
import { suggestCapacity, selectionStatus } from '../../services/capacity';
import { formGroups, describeGroups, groupMakeup } from '../../services/pairing';

/** Fallback average leg (km) used for the capacity suggestion before a route is computed. */
const DEFAULT_AVG_LEG_KM = 2;

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
    AssignTerritoriesDockComponent,
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
  private readonly distribution = inject(TeamDistributionService);

  /** Navigation-surviving session + cart state. */
  public readonly state = inject(AssignTerritoriesStateService);

  public readonly ALL_OPTION = ALL_OPTION;
  public readonly sortFilterConfig = TERRITORY_SORT_FILTER_CONFIG;

  private territories$: Observable<Territory[]> = of([]);

  cities: string[] = [];
  selectedCity = '';
  searchTerm?: string | null;
  searchFilters: TerritoryFilterSettings['filters'] = TERRITORY_SORT_FILTER_CONFIG.filterConfigs.initial;
  orderBy: TerritoriesOrderBy = TerritoriesOrderBy.SAVED_INDEX;
  filteredTerritories$: Observable<Territory[]> = of([]);

  searchInputComponent = viewChild.required(SearchInputComponent);

  // Route optimization + team distribution state
  /** Accumulates every loaded territory so the optimizer can resolve any selected id synchronously. */
  private readonly territoryById = new Map<string, Territory>();
  /** Average minutes spent per visit. */
  private readonly visitMin = 10;

  /** Crew composition entered in the team panel. */
  public readonly team = signal({ men: 0, women: 0, cars: 0, durationMin: 120, economize: true });
  /** Per-car distribution after "Otimizar e distribuir". */
  public readonly plan = signal<DistributionPlan | null>(null);
  /** Index of the car whose "Compartilhar" request is in flight, if any. */
  public readonly isSharingCar = signal<number | null>(null);

  public readonly CAR_COLORS = ['#45c06c', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16'];
  public readonly describeGroups = describeGroups;
  public readonly groupMakeup = groupMakeup;

  /** Work-group composition + capacity suggestion, derived from the crew, plan and current selection. */
  public readonly crew = computed(() => {
    const team = this.team();
    const groups = formGroups(team.men, team.women);
    const numGroups = groups.groups.length;
    // Capacity scales with the number of work groups (pairs + trios), not raw headcount.
    const suggestion = suggestCapacity({
      pairs: Math.max(1, numGroups),
      durationMin: team.durationMin,
      avgLegKm: this.plan()?.avgLegKm ?? DEFAULT_AVG_LEG_KM,
      visitMin: this.visitMin,
    });

    return {
      groups,
      numGroups,
      groupText: describeGroups(groups),
      groupUnplaced: groups.unplacedMen + groups.unplacedWomen,
      suggestion,
      selectionState: selectionStatus(this.state.selectedCount(), suggestion.suggestedTotal),
    };
  });

  /** Global route order (all cars flattened) + per-territory position/car maps, derived from the plan. */
  private readonly flatRoute = computed(() => {
    const order: string[] = [];
    const orderIndexById = new Map<string, number>(); // territory id -> 1-based global route position
    const carIndexById = new Map<string, number>(); // territory id -> 0-based car

    this.plan()?.cars.forEach((car) => {
      car.territories.forEach((t) => {
        order.push(t.id);
        orderIndexById.set(t.id, order.length);
        carIndexById.set(t.id, car.carIndex);
      });
    });

    return { order, orderIndexById, carIndexById };
  });

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

    // Use the optimized route order when it covers exactly the current selection; otherwise selection order.
    const selectionIds = Array.from(this.state.selectedTerritoryIds());
    const optimizedOrder = this.flatRoute().order;
    const territoryIds =
      optimizedOrder.length === selectionIds.length && selectionIds.every((id) => optimizedOrder.includes(id))
        ? optimizedOrder
        : selectionIds;

    this.plan.set(null);
    this.state.isCreatingAssignment.set(true);

    this.designationsHeaderBO
      .createDesignation(territoryIds, this.state.header())
      .pipe(finalize(() => this.state.isCreatingAssignment.set(false)))
      .subscribe({
        next: ({ designation, header }) => {
          this.state.setHeader(header);
          this.state.addAssignedDesignation(designation.id, territoryIds);
          this.shareDesignation(designation.id);
        },
        error: () => {
          this.toaster.error('Não foi possível criar a designação. Tente novamente.');
        },
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
          error: () => {
            this.toaster.error('Não foi possível encerrar as designações. Tente novamente.');
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

    // Any selection change invalidates a previously computed distribution.
    this.plan.set(null);

    if (value && importantAlert) {
      this.openConfirmAssignmentDialog(importantAlert).subscribe((result) => {
        if (!result) {
          this.state.setTerritorySelection(territoryId, false);
        }
      });
    }
  }

  /** Crew number inputs (Homens / Mulheres / Carros / Duração). */
  onTeamNumberChange(field: 'men' | 'women' | 'cars' | 'durationMin', value: number) {
    this.team.update((team) => ({ ...team, [field]: value }));
  }

  /** Re-runs the distribution when the economize toggle flips (if a plan is showing). */
  onEconomizeChange(economize: boolean) {
    this.team.update((team) => ({ ...team, economize }));
    if (this.plan()) {
      this.handleDistribute();
    }
  }

  /**
   * Forms work groups (pairs/trios) from the crew, optimizes the selected territories,
   * and distributes them into per-car clusters. Runs synchronously from loaded territories.
   */
  handleDistribute() {
    const ids = Array.from(this.state.selectedTerritoryIds());
    if (ids.length < 2 || this.crew().numGroups < 1) {
      return; // need at least 2 territories and a crew that forms at least one pair/trio
    }

    const selected = ids.map((id) => this.territoryById.get(id)).filter((t): t is Territory => !!t);

    this.plan.set(
      this.distribution.distribute(selected, {
        men: this.team().men,
        women: this.team().women,
        cars: this.team().cars,
        visitMin: this.visitMin,
        durationMin: this.team().durationMin,
        economize: this.team().economize,
      }),
    );
  }

  /**
   * One-click distribution: auto-select the most-overdue territories (ordered by last
   * visit) up to the suggested count for the current team, then optimize + distribute.
   * Pool is the loaded territories for the active city (or all cities when "Todas").
   */
  handleAutoDistribute() {
    const target = this.crew().suggestion.suggestedTotal;
    if (target < 2) {
      return;
    }

    // Pool = the territories currently VISIBLE (same city + filters the user sees), so the
    // auto-selection matches what gets badged and never picks filtered-out ones (e.g. bible students).
    this.filteredTerritories$.pipe(take(1)).subscribe((list) => {
      const assigned = this.state.assignedTerritoryIndex();
      const stalest = [...list]
        .filter((t) => !assigned.has(t.id))
        .sort((a, b) => (a.lastVisit?.getTime() ?? 0) - (b.lastVisit?.getTime() ?? 0)); // stalest first

      // Pass 1: distribute the default-estimate count to learn the real average leg.
      this.state.replaceSelection(stalest.slice(0, target).map((t) => t.id));
      this.handleDistribute();

      // Pass 2: the suggestion just refined using the real travel - if fewer territories
      // actually fit the time budget, trim to that and redistribute so pairs stay in budget.
      const refined = this.crew().suggestion.suggestedTotal;
      if (refined >= 2 && refined < target) {
        this.state.replaceSelection(stalest.slice(0, refined).map((t) => t.id));
        this.handleDistribute();
      }
    });
  }

  /** Trims the current selection to the suggested total, keeping the stalest (most overdue). */
  trimToSuggested() {
    const target = this.crew().suggestion.suggestedTotal;
    if (!target || this.state.selectedCount() <= target) {
      return;
    }

    const kept = Array.from(this.state.selectedTerritoryIds())
      .map((id) => this.territoryById.get(id))
      .filter((t): t is Territory => !!t)
      .sort((a, b) => (a.lastVisit?.getTime() ?? 0) - (b.lastVisit?.getTime() ?? 0)) // stalest first
      .slice(0, target);

    this.state.replaceSelection(kept.map((t) => t.id));
    this.plan.set(null);
  }

  /** Whether every territory of this car was already assigned to a designation. */
  carShared(car: CarPlan): boolean {
    const assigned = this.state.assignedTerritoryIndex();
    return car.territories.length > 0 && car.territories.every((t) => assigned.has(t.id));
  }

  /** Creates a designation for one car's cluster (in route order) and shares it via WhatsApp. */
  shareForCar(car: CarPlan) {
    this.isSharingCar.set(car.carIndex);
    const ids = car.territories.map((t) => t.id);

    this.designationsHeaderBO
      .createDesignation(ids, this.state.header())
      .pipe(finalize(() => this.isSharingCar.set(null)))
      .subscribe({
        next: ({ designation, header }) => {
          this.state.setHeader(header);
          this.state.addAssignedDesignation(designation.id, ids);
          this.shareDesignation(designation.id);
        },
        error: () => {
          this.toaster.error('Não foi possível criar a designação. Tente novamente.');
        },
      });
  }

  /** 1-based position of a territory id in the optimized route, or null if not distributed yet. */
  orderIndexOf(id: string): number | null {
    return this.flatRoute().orderIndexById.get(id) ?? null;
  }

  /** Color of a territory's assigned car, or null when not distributed. */
  carColorOf(id: string): string | null {
    const carIndex = this.flatRoute().carIndexById.get(id);
    return carIndex === undefined ? null : this.carColor(carIndex);
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
      tap((list) => list.forEach((t) => this.territoryById.set(t.id, t))),
      shareReplay(1),
    );

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
        title: 'Encerrar Designações?',
        bodyText:
          '<p>Os territórios já designados continuarão salvos com seus respectivos publicadores.</p>' +
          '<p class="mt-4 t-caption"><strong>Nota:</strong> As sessões de designação são encerradas automaticamente todos os dias à meia-noite.</p>',
      },
    }).closed;
  }
}
