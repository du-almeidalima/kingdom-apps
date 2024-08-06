import { Observable } from 'rxjs';
import { InvitationLink } from '../../models/invitation-link';

export abstract class InvitationLinkRepository {
  abstract getById(id: string): Observable<InvitationLink | undefined>;
  abstract add(invitationLink: Omit<InvitationLink, 'id'>): Observable<InvitationLink>;
}
