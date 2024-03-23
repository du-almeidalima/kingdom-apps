// Commeting this out while it's not used
// @Injectable({
//   providedIn: 'root',
// })
// export class NoteDatasourceService implements NoteRepository {
//   private readonly db = iDb;
//
//   add(note: PickPartial<Note, 'createdAt' | 'id'>) {
//     const noteWithDate: Note = {
//       ...note,
//       createdAt: new Date(),
//     };
//
//     this.db.notes.add(noteWithDate);
//
//     return of(noteWithDate);
//   }
//
//   get(territoryId: string) {
//     return from(this.db.notes.get({ territoryId }));
//   }
//
//   reset() {
//     return from(this.db.resetNotes());
//   }
// }
