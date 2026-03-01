import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { IconComponent } from '../icon/icon.component';
import { SortFilterConfig, SortFilterValue } from './types/sort-filter.model';
import { SortFilterDialogComponent } from './sort-filter-dialog/sort-filter-dialog.component';
import { grey400 } from '../../styles/abstract/variables';

@Component({
  selector: 'lib-sort-filter',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['./sort-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <button class="sort-filter__button" type="button" (click)="handleOpenDialog()">
        <lib-icon [fillColor]="iconColor()" class="h-8 w-8" icon="filter-down-lined" />
      </button>
      @if (activeFilterCount() > 0) {
      <span class="sort-filter__badge">{{ activeFilterCount() }}</span>
      }
    </div>
  `,
})
export class SortFilterComponent implements OnInit {
  private readonly dialog = inject(Dialog);

  protected iconColor = signal(grey400);

  private currentValue = signal<SortFilterValue>({
    sort: undefined,
    filters: undefined,
  });

  config = input<SortFilterConfig>({});

  initialValue = input<SortFilterValue>({
    sort: undefined,
    filters: undefined,
  });

  storeFilterState = input<boolean, string | boolean>(false, { transform: booleanAttribute });

  storageKey = input<string>('sort-filter-state');

  changed = output<SortFilterValue>();

  activeFilterCount = computed(() => {
    const initial = this.initialValue();
    const current = this.currentValue();
    return this.countActiveFilters(initial.filters ?? {}, current.filters ?? {});
  });

  ngOnInit() {
    const initialValue = this.initialValue();
    const config = this.config();

    const value: SortFilterValue = {
      sort: initialValue.sort ?? config.sortConfigs?.initial,
      filters: {
        ...(config.filterConfigs?.initial ?? {}),
        ...(initialValue.filters ?? {}),
      },
    };

    // Load from localStorage if enabled
    if (this.storeFilterState()) {
      // Use untracked to read from localStorage without creating dependencies
      const persisted = untracked(() => this.loadFromStorage());
      if (persisted) {
        if (persisted.sort) {
          value.sort = persisted.sort;
        }
        if (persisted.filters) {
          value.filters = {
            ...value.filters,
            ...persisted.filters,
          };
        }
      }
    }

    this.currentValue.set(value);

    // Emit the values it has at the time of a load
    this.changed.emit(value);
  }

  handleOpenDialog() {
    const config = this.config();
    const currentValue = this.currentValue();

    // Always use currentValue to maintain form state across the dialog opens
    const dialogRef = this.dialog.open<SortFilterValue>(SortFilterDialogComponent, {
      data: {
        ...config,
        sortConfigs: config.sortConfigs
          ? {
              ...config.sortConfigs,
              initial: currentValue.sort || config.sortConfigs.initial,
            }
          : undefined,
        filterConfigs: config.filterConfigs
          ? {
              ...config.filterConfigs,
              initial: {
                ...config.filterConfigs.initial,
                ...currentValue.filters,
              },
            }
          : undefined,
      },
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        const previousValue = this.currentValue();

        const hasChanged = JSON.stringify(result) !== JSON.stringify(previousValue);
        if (hasChanged) {
          this.changed.emit(result);
        }

        this.currentValue.set(result);

        // Persist to localStorage if enabled
        if (this.storeFilterState()) {
          this.saveToStorage(result);
        }
      }
    });
  }

  private countActiveFilters(initial: Record<string, any>, current: Record<string, any>): number {
    let count = 0;
    const allKeys = new Set([...Object.keys(initial), ...Object.keys(current)]);

    for (const key of allKeys) {
      const initialVal = initial[key];
      const currentVal = current[key];

      // Check if the value has changed from initial and is not empty/null/undefined
      const hasValue = currentVal !== null && currentVal !== undefined && currentVal !== '' && currentVal !== false;
      const isDifferent = JSON.stringify(initialVal) !== JSON.stringify(currentVal);

      if (hasValue && isDifferent) {
        count++;
      }
    }

    return count;
  }

  private saveToStorage(value: SortFilterValue): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save filter state to localStorage:', error);
    }
  }

  private loadFromStorage(): SortFilterValue | null {
    try {
      const stored = localStorage.getItem(this.storageKey());
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load filter state from localStorage:', error);
      return null;
    }
  }
}
