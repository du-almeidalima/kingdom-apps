import { map, Observable } from 'rxjs';
import { Territory } from '../../../models/territory';

export const ALL_OPTION = 'ALL';

export enum TerritoriesOrderBy {
  LAST_VISIT = 'LAST_VISIT',
  SAVED_INDEX = 'SAVED_INDEX',
}

/**
 * Represents the filter settings used to filter or sort territories.
 */
export type TerritoryFilterSettings = {
  searchTerm?: string | null;
  city: string;
  orderBy?: TerritoriesOrderBy;
};

/**
 * Filters territories based on the given city name.
 *
 * @param {Territory} t - The territory object to evaluate.
 * @param {string} city - The city name to filter by. If the value is equal to `ALL_OPTION`, the filter will always return true.
 */
export const cityFilter = (t: Territory, city: string) => {
  if (city === ALL_OPTION) {
    return true;
  }

  return city.toLowerCase().localeCompare(t.city.toLowerCase()) === 0;
}

/**
 * Given a Territory observable, this function returns a filtered observable with every Territory that has a match
 * for *searchTerm* for the following properties:
 * - address
 * - note
 * It also sorts the Territory by its positionIndex in ascending order
 */
export const territoriesFilterPipe = (
  territory$: Observable<Territory[]>,
  filterSettings: TerritoryFilterSettings
): Observable<Territory[]> => {
  const searchTerm = filterSettings.searchTerm;
  const orderBy = filterSettings.orderBy;
  const city = filterSettings.city;

  let sortFn = (t1: Territory, t2: Territory) => {
    if (orderBy === TerritoriesOrderBy.LAST_VISIT) {
      return (t1.lastVisit?.getTime() ?? 0) - (t2.lastVisit?.getTime() ?? 0);
    }

    return (t1.positionIndex ?? 0) - (t2.positionIndex ?? 0);
  }

  // Sorting per city when ALL is selected, as it would be a little confusing using the saved index.
  if (city === ALL_OPTION) {
    sortFn = (a, b) => {
      return a.city.localeCompare(b.city);
    };
  }

  return territory$.pipe(
    map(tArr => {

      if (!searchTerm) {
        return tArr
          .filter((t) => cityFilter(t, city))
          .sort(sortFn);
      }

      const searchWords = searchTerm.split(' ');

      return tArr
        .filter(t => {
          if (!cityFilter(t, city)) {
            return false;
          }

          const territorySearchableText = (t.address + t.note).toLowerCase();

          return searchWords.every(word => territorySearchableText.includes(word.toLowerCase()));
        })
        .sort(sortFn);
    })
  );
};
