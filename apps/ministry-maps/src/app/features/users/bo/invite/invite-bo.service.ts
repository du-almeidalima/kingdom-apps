import { inject, Injectable } from '@angular/core';
import { RoleEnum } from '../../../../../models/enums/role';
import { InvitationLink } from '../../../../../models/invitation-link';
import { EMPTY, Observable, tap } from 'rxjs';
import { InvitationLinkRepository } from '../../../../repositories/invitation-link.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';

@Injectable({
  providedIn: 'root',
})
export class InviteBO {
  private readonly inviteRepository = inject(InvitationLinkRepository);
  private readonly userState = inject(UserStateService);
  private readonly loggerService = inject(LoggerService);

  createInviteLink({ email, role }: { email?: string | null; role: RoleEnum }): Observable<InvitationLink> {
    if (!this.userState.currentUser?.congregation) {
      this.loggerService.error('No User: [{}] found while creating Invitation Link.');
      return EMPTY;
    }

    const inviteLink: Omit<InvitationLink, 'id'> = {
      createdAt: new Date(),
      role: role,
      isValid: true,
      createdBy: this.userState.currentUser.email,
      congregation: this.userState.currentUser?.congregation,
      email: email ?? undefined,
    };

    return this.inviteRepository.add(inviteLink).pipe(
      tap(createdInviteLink => {
        const user = this.userState.currentUser;
        const congregation = user?.congregation;

        this.loggerService.info(
          `User [${user?.name}] (${user?.id}) of Congregation [${congregation?.name}] (${congregation?.id}) created Invitation Link [${createdInviteLink?.id}].`
        );
      })
    );
  }


  consumeInviteLink(inviteLink: InvitationLink): Observable<void> {
    inviteLink.isValid = false;
    inviteLink.usedAt = new Date();
    inviteLink.usedBy = this.userState?.currentUser?.email;

    return this.inviteRepository.update(inviteLink);
  }
}
