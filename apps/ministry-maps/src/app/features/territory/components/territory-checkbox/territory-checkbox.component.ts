import { ChangeDetectionStrategy, Component, forwardRef, computed, inject, input, output, signal } from '@angular/core';
import { Territory } from '../../../../../models/territory';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import openGoogleMapsHandler from '../../../../shared/utils/open-google-maps';
import { IconButtonComponent, IconComponent, Icons } from '@kingdom-apps/common-ui';
import { Dialog } from '@angular/cdk/dialog';
import { HistoryDialogComponent } from '../../../../shared/components/dialogs';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import mapTerritoryIcon, { isIconLarge } from '../../../../shared/utils/territory-icon-mapper';
import { DatePipe, NgClass } from '@angular/common';
import { VisitOutcomeToIconPipe } from '../../../../shared/pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';

@Component({
  selector: 'kingdom-apps-territory-checkbox',
  styleUrls: ['territory-checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TerritoryCheckboxComponent),
      multi: true,
    },
  ],
  template: `
    <label
      role="presentation"
      class="territory-checkbox"
      data-testid="assign-territory-checkbox"
      [for]="territory().id"
      [title]="disabled() ? assignedTitle : null"
      [ngClass]="{
        'territory-checkbox--disabled': disabled(),
        'territory-checkbox--selected': !disabled() && value(),
      }"
      (click)="handleCardClick($event)"
    >
      <div class="territory-checkbox__control-container">
        <input
          type="checkbox"
          [name]="territory().id"
          [id]="territory().id"
          [checked]="value()"
          [ngModel]="value()"
          hidden
          (ngModelChange)="setValue($event)"
        />
        <div
          class="territory-checkbox__description"
          [ngClass]="{ 'territory-checkbox__description--disabled': disabled() }"
        >
          <!-- Title and Subtitle -->
          <div class="territory-checkbox__title-subtitle-container">
            <lib-icon
              class="territory-checkbox__icon"
              [ngClass]="{ 'territory-checkbox__icon--large': isIconLarge() }"
              [fillColor]="iconColor"
              [icon]="icon()"
            />
            <!-- Address and Note -->
            <div class="flex flex-col gap-1">
              <h3 class="territory-checkbox__title">{{ territory().address }}</h3>
              <span class="territory-checkbox__subtitle">{{ territory().note }}</span>
            </div>
          </div>
          <!-- VISIT CONTAINER -->
          <div class="territory-checkbox__visit-container">
            @if (territory().lastVisit) {
              <div class="territory-checkbox__last-visit-container">
                <span class="territory-checkbox__last-visit-label">
                  Última visita: {{ territory().lastVisit | date: 'dd/MM/yyyy' }}
                </span>
                @if (
                  territory().recentHistory?.length &&
                  territory().recentHistory![territory().recentHistory!.length - 1].visitOutcome !== undefined
                ) {
                  <lib-icon
                    [ngClass]="{
                      '-mt-0.5':
                        territory().recentHistory![territory().recentHistory!.length - 1].visitOutcome ===
                        VisitOutcomeEnum.NOT_ANSWERED,
                      '-mt-1.5':
                        territory().recentHistory![territory().recentHistory!.length - 1].visitOutcome !==
                        VisitOutcomeEnum.NOT_ANSWERED,
                    }"
                    class="territory-checkbox__last-visit-icon"
                    [icon]="
                      territory().recentHistory![territory().recentHistory!.length - 1].visitOutcome | visitOutcomeToIcon
                    "
                    [fillColor]="iconColor"
                  />
                }
              </div>
            }
            <!-- VISIT STATUS BADGE -->
            @if (hasRecentRevisit()) {
              <span
                class="territory-alert-badge territory-alert-badge--revisit"
                title="Essa pessoa foi marcada como revisita recentemente"
              >
                Revisita
              </span>
            }
            @if (hasRecentlyMoved()) {
              <span class="territory-alert-badge territory-alert-badge--moved" title="Essa pessoa se mudou">
                Mudou
              </span>
            }
            @if (hasRecentlyAskedToStopVisiting()) {
              <span
                class="territory-alert-badge territory-alert-badge--stop-visiting"
                title="Essa pessoa disse que não quer ser visitada por uma Testemunha de Jeová"
              >
                Não quer visitas
              </span>
            }
            @if (isBibleStudent()) {
              <span
                class="territory-alert-badge territory-alert-badge--bible-student"
                title="Essa pessoa é um estudante da Bíblia"
              >
                Estudante
              </span>
            }
          </div>
        </div>
        <!-- BUTTONS CONTAINER -->
        <div class="territory-checkbox__buttons-container">
          @if (territory().mapsLink; as mapsLink) {
            <button lib-icon-button type="button" (click)="handleOpenMaps(mapsLink)">
              <lib-icon [fillColor]="buttonIconColor" icon="map-5"></lib-icon>
            </button>
          }
          @if (territory().recentHistory) {
            <button lib-icon-button type="button" (click)="handleOpenHistory()">
              <lib-icon [fillColor]="buttonIconColor" icon="time-17"></lib-icon>
            </button>
          }
        </div>
      </div>
      <span class="territory-checkbox__indicator" [ngClass]="statusClass()"></span>
    </label>
  `,
  imports: [FormsModule, NgClass, IconComponent, DatePipe, IconButtonComponent, VisitOutcomeToIconPipe],
})
export class TerritoryCheckboxComponent implements ControlValueAccessor {
  private readonly dialog = inject(Dialog);

  protected readonly iconColor = 'currentColor';
  protected readonly VisitOutcomeEnum = VisitOutcomeEnum;
  /** Tooltip hinting that tapping an already-assigned (disabled) row re-sends the designation. */
  protected readonly assignedTitle = 'Enviar designação novamente';

  buttonIconColor = 'var(--kui-color-action-primary)';

  territory = input.required<Territory>();

  /** Emitted when the disabled (already assigned) card itself is tapped, excluding its action buttons. */
  assignedClick = output();

  hasRecentRevisit = computed(() => TerritoryAlertsBO.hasRecentRevisit(this.territory()));
  hasRecentlyMoved = computed(() => TerritoryAlertsBO.hasRecentlyMoved(this.territory()));
  hasRecentlyAskedToStopVisiting = computed(() => TerritoryAlertsBO.hasRecentlyAskedToStopVisiting(this.territory()));
  isBibleStudent = computed(() => TerritoryAlertsBO.isBibleStudent(this.territory()));

  icon = computed<Icons>(() => mapTerritoryIcon(this.territory().icon));
  isIconLarge = computed(() => isIconLarge(this.icon()));

  // Control Value Accessor
  disabled = signal(false);
  value = signal(false);

  statusClass = computed(() => {
    const prefix = 'territory-checkbox__indicator--';

    if (this.disabled()) {
      return prefix + 'disabled';
    }

    return prefix + (this.value() ? 'selected' : 'default');
  });

  // Resolve style indicator
  onTouched: () => void = () => {
    return;
  };

  onChange: (value: boolean) => void = () => {
    return;
  };

  registerOnChange(fn: TerritoryCheckboxComponent['onChange']): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: TerritoryCheckboxComponent['onTouched']): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  writeValue(value: boolean): void {
    this.value.set(value);
  }

  setValue(value: boolean) {
    if (this.disabled()) {
      return;
    }

    this.value.set(value);

    this.onChange(value);
    this.onTouched();
  }

  /**
   * Tapping a disabled (already assigned) card re-triggers the designation share (handled by the
   * parent page). Clicks on the inner action buttons keep their own behavior and are ignored here.
   */
  handleCardClick(event: MouseEvent) {
    if (!this.disabled()) {
      return;
    }

    // Suppress the native label→checkbox activation
    event.preventDefault();

    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    this.assignedClick.emit();
  }

  // Maybe the handleOpenMaps and handleOpenHistory should not be part of this component
  handleOpenMaps(mapsLink: string) {
    openGoogleMapsHandler(mapsLink, this.territory());
  }

  handleOpenHistory() {
    this.dialog.open<HistoryDialogComponent, TerritoryVisitHistory[]>(HistoryDialogComponent, {
      data: this.territory().recentHistory?.slice().reverse(),
    });
  }
}
