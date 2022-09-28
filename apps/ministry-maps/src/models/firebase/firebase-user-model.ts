import { DocumentReference } from '@angular/fire/firestore';

import { User } from '../user';
import { Congregation } from '../congregation';

export type FirebaseUserModel = Omit<User, 'congregation'> & { congregation: DocumentReference<Congregation> };
