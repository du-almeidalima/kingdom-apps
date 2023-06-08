import { map, Observable } from 'rxjs';
import { Territory } from '../../../models/territory';

/**
 * Given a Territory observable, this function returns a filtered observable with every Territory that has a match
 * for *searchTerm* for the following properties:
 * - address
 * - note
 * @param territory$
 * @param searchTerm
 */
export const territoryFilterPipe = (territory$: Observable<Territory[]>, searchTerm: string) => {
  return territory$.pipe(
    map(tArr => {
      if (!searchTerm) {
        return tArr;
      }

      const searchWords = searchTerm.split(' ');

      return tArr.filter(t => {
        const territorySearchableText = (t.address + t.note).toLowerCase();

        return searchWords.every(word => territorySearchableText.includes(word.toLowerCase()));
      });
    })
  );
}
