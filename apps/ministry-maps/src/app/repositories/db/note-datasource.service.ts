import { Injectable } from '@angular/core';
import { db as iDb } from './app.db';
import { NoteRepository } from '../note.repository';
import { PickPartial } from '../../shared/utils/type-utils';
import { Note } from '../../../models/note';
import { from, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NoteDatasourceService implements NoteRepository {
  private readonly db = iDb;

  add(note: PickPartial<Note, 'createdAt' | 'id'>) {
    const noteWithDate: Note = {
      ...note,
      createdAt: new Date(),
    };

    this.db.notes.add(noteWithDate);

    return of(noteWithDate);
  }

  get(territoryId: string) {
    return from(this.db.notes.get({ territoryId }));
  }

  reset() {
    return from(this.db.resetNotes());
  }
}
