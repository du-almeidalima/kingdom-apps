import { SelectFilterConfig, SortFilterConfig, ToggleFilterConfig } from '@kingdom-apps/common-ui';
import { TerritoriesOrderBy, TerritoryFilterSettings } from '../../../shared/utils/territories-filter-pipe';
import { TerritoryIcon } from '../../../../models/territory';

export type TerritoryFilterConfig = {
  includeBibleStudent: ToggleFilterConfig;
  includeMoved: ToggleFilterConfig;
  icon: SelectFilterConfig;
};

/**
 * The intersection pins `initial` to the real domain filter shape so consumers read it
 * without casts while the literal stays checked against {@link TerritoryFilterSettings}.
 */
export const TERRITORY_SORT_FILTER_CONFIG: SortFilterConfig<TerritoryFilterConfig> & {
  filterConfigs: { initial: TerritoryFilterSettings['filters'] };
} = {
  sortConfigs: {
    initial: TerritoriesOrderBy.SAVED_INDEX,
    options: [
      { value: TerritoriesOrderBy.SAVED_INDEX, label: 'Ordem de Cadastro' },
      { value: TerritoriesOrderBy.LAST_VISIT, label: 'Última Visita' },
    ],
  },
  filterConfigs: {
    initial: {
      includeBibleStudent: true,
    },
    options: {
      includeBibleStudent: {
        title: 'Estudantes da Bíblia',
        controlName: 'includeBibleStudent',
        filterType: 'toggle',
        secondaryText: 'Filtrar territórios com estudantes da Bíblia',
      },
      includeMoved: {
        title: 'Territórios que Mudaram',
        controlName: 'includeMoved',
        filterType: 'toggle',
        secondaryText: 'Incluir territórios que mudaram de endereço',
      },
      icon: {
        title: 'Ícone',
        controlName: 'icon',
        filterType: 'select',
        placeholder: 'Todos',
        options: [
          { value: TerritoryIcon.MAN, label: 'Homem' },
          { value: TerritoryIcon.WOMAN, label: 'Mulher' },
          { value: TerritoryIcon.CHILD, label: 'Criança' },
          { value: TerritoryIcon.COUPLE, label: 'Casal' },
          { value: TerritoryIcon.OTHER, label: 'Outro' },
        ],
      },
    },
  },
};
