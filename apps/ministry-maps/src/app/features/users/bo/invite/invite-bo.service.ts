import { inject, Injectable } from '@angular/core';
import { RoleEnum } from '../../../../../models/enums/role';
import { InvitationLink } from '../../../../../models/invitation-link';
import { Observable } from 'rxjs';
import { InvitationLinkRepository } from '../../../../repositories/invitation-link.repository';
import { UserStateService } from '../../../../state/user.state.service';

@Injectable({
  providedIn: 'root',
})
export class InviteBO {
  inviteRepository = inject(InvitationLinkRepository);
  userState = inject(UserStateService);

  createInviteLink({ email, role }: { email?: string | null; role: RoleEnum }): Observable<InvitationLink> {
    if (!this.userState.currentUser?.congregation) {
      throw new Error("User not logged in");
    }

    const inviteLink: Omit<InvitationLink, 'id'> = {
      createdAt: new Date(),
      role: role,
      isValid: true,
      createdBy: this.userState.currentUser.email,
      congregation: this.userState.currentUser?.congregation,
      email: email ?? undefined,
    };

    return this.inviteRepository.add(inviteLink);
  }


  consumeInviteLink(inviteLink: InvitationLink): Observable<void> {
    inviteLink.isValid = false;
    inviteLink.usedAt = new Date();
    inviteLink.usedBy = this.userState?.currentUser?.email;

    return this.inviteRepository.update(inviteLink);
  }
}
