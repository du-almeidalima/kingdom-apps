import { map, Observable } from 'rxjs';
import { Territory } from '../../../models/territory';

/**
 * Given a Territory observable, this function returns a filtered observable with every Territory that has a match
 * for *searchTerm* for the following properties:
 * - address
 * - note
 * It also sorts the Territory by its positionIndex in ascending order
 * @param territory$
 * @param searchTerm
 */
export const territoryFilterPipe = (territory$: Observable<Territory[]>, searchTerm: string) => {
  return territory$.pipe(
    map(tArr => {
      if (!searchTerm) {
        return tArr.sort((t1, t2) => (t1.positionIndex ?? 0) - (t2.positionIndex ?? 0));
      }

      const searchWords = searchTerm.split(' ');

      return tArr
        .filter(t => {
          const territorySearchableText = (t.address + t.note).toLowerCase();

          return searchWords.every(word => territorySearchableText.includes(word.toLowerCase()));
        })
        .sort((t1, t2) => (t1.positionIndex ?? 0) - (t2.positionIndex ?? 0));
    })
  );
};
