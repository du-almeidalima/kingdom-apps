import { DocumentReference } from '@angular/fire/firestore';

export interface FirebaseDatasource<T> {
  /**
   * Creates a document ref for this Datasource using its ID.
   */
  createDocumentRef(id: string): DocumentReference<T>;
}
