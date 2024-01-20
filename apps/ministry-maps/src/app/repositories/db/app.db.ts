import Dexie, { Table } from 'dexie';
import { Note } from '../../../models/note';

export class AppDB extends Dexie {
  private readonly NOTES_TABLE = 'notes';
  private readonly id = Math.floor(Math.random() * 100);


  notes!: Table<Note, number>;

  constructor() {
    super('ministry-maps-idb');
    // If any migration is needed, refer to https://dexie.org/docs/API-Reference#upgrade
    this.version(1).stores({
      [this.NOTES_TABLE]: '++id, &territoryId',
    });
  }

  // TODO: Import Notes Feature using PWA file Handlers
  async populate() {
    await db.notes.bulkAdd([]);
  }

  async resetNotes() {
    await db.transaction('rw', this.NOTES_TABLE, () => {});
  }
}

export const db = new AppDB();
