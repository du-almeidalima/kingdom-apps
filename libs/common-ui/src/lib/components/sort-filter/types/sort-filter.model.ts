import { Icons } from '../../icon/icon-type';

export interface SortOption {
  value: string;
  label: string;
}

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

export interface SortFilterConfig {
  sortConfigs?: {
    initial: SortOption['value'];
    options: SortOption[];
  };
  filterConfigs?: {
    initial?: Record<string, any>;
    options: Record<string, FilterConfig>;
  };
}

export interface SortFilterValue {
  sort?: string;
  filters?: Record<string, any>;
}
