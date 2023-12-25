import { map, Observable } from 'rxjs';
import { Territory } from '../../../models/territory';

export enum TerritoriesOrderBy {
  LAST_VISIT = 'LAST_VISIT',
  SAVED = 'SAVED',
}

/**
 * Given a Territory observable, this function returns a filtered observable with every Territory that has a match
 * for *searchTerm* for the following properties:
 * - address
 * - note
 * It also sorts the Territory by its positionIndex in ascending order
 * @param territory$
 * @param searchTerm
 * @param orderBy
 */
export const territoryFilterPipe = (
  territory$: Observable<Territory[]>,
  searchTerm: string,
  orderBy?: TerritoriesOrderBy
) => {
  return territory$.pipe(
    map(tArr => {
      const sortFn = (t1: Territory, t2: Territory) => {
        if (orderBy === TerritoriesOrderBy.LAST_VISIT) {
          return (t1.lastVisit?.getTime() ?? 0) - (t2.lastVisit?.getTime() ?? 0);
        }

        return (t1.positionIndex ?? 0) - (t2.positionIndex ?? 0);
      }

      if (!searchTerm) {
        return tArr.sort(sortFn);
      }

      const searchWords = searchTerm.split(' ');

      return tArr
        .filter(t => {
          const territorySearchableText = (t.address + t.note).toLowerCase();

          return searchWords.every(word => territorySearchableText.includes(word.toLowerCase()));
        })
        .sort(sortFn);
    })
  );
};
