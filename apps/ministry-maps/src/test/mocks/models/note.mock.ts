import { EMPTY, Observable } from 'rxjs';
import { NoteRepository } from '../../../app/repositories/note.repository';
import { PickPartial } from '../../../app/shared/utils/type-utils';
import { Note } from '../../../models/note';

// MOCK CLASSES
export class NoteRepositoryMock implements NoteRepository {
  add(note: PickPartial<Note, "createdAt" | "id">): Observable<Note> {
    return EMPTY;
  }

  get(territoryId: string): Observable<Note | undefined> {
    return EMPTY;
  }

  reset(): Observable<void> {
    return EMPTY;
  }
}

// NOTES
const note: Note = {
  id: 'note-1',
  territoryId: 'territory-1',
  createdAt: new Date(),
  note: 'A note text'
};

export const noteMockBuilder = (partialNote: Partial<Note>) => {
  return {
    ...note,
    ...partialNote
  }
}

