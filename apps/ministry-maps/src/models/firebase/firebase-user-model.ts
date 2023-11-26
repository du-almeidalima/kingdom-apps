import { DocumentReference } from '@angular/fire/firestore';

import { User } from '../user';
import { Congregation } from '../congregation';
import { FirebaseCongregationModel } from './firebase-congregation-model';

export type FirebaseUserModel = Omit<User, 'congregation'> & {
  congregation: DocumentReference<Congregation, FirebaseCongregationModel>;
};
