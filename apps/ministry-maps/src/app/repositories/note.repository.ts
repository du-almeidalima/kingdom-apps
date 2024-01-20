import { Observable } from 'rxjs';
import { Note } from '../../models/note';
import { PickPartial } from '../shared/utils/type-utils';

export abstract class NoteRepository {
  abstract add(note: PickPartial<Note, 'createdAt' | 'id'>): Observable<Note>;
  abstract get(territoryId: string): Observable<Note | undefined>;
  abstract reset(): Observable<void>;
}
