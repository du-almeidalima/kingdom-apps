import { Icons } from '../../icon/icon-type';

export type FilterType = 'select' | 'toggle' | 'text';

export interface BaseFilterConfig {
  title: string;
  controlName: string;
  filterType: FilterType;
}

export interface SelectFilterConfig extends BaseFilterConfig {
  filterType: 'select';
  placeholder?: string;
  options: { value: any; label: string }[];
}

export interface ToggleFilterConfig extends BaseFilterConfig {
  filterType: 'toggle';
  icon?: Icons;
  secondaryText?: string;
}

export interface TextFilterConfig extends BaseFilterConfig {
  filterType: 'text';
  placeholder?: string;
}

export type FilterConfig = SelectFilterConfig | ToggleFilterConfig | TextFilterConfig;

/**
 * Represents a single option for sorting.
 */
export type SortOption = {
  value: string;
  label: string;
};

/**
 * Represents a single option for filtering.
 */
export type FilterOption = Record<string, FilterConfig>;

/**
 * Represents the configuration building the Sort and Filter with its options and initial state.
 */
export type SortFilterConfig<
  TFilterOptions extends FilterOption = FilterOption,
  TSortOptions extends SortOption[] = SortOption[]
> = {
  sortConfigs?: {
    initial: SortOption['value'];
    options: TSortOptions;
  };
  filterConfigs?: {
    initial: Partial<{[key in keyof TFilterOptions]: any}> | undefined;
    options: TFilterOptions;
  };
};

/**
 * Represents the state of the sort and filter.
 */
export interface SortFilterValue {
  sort?: string;
  filters?: Record<string, any>;
}
