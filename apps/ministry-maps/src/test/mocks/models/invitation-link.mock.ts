import { EMPTY, Observable, of } from 'rxjs';
import { InvitationLinkRepository } from '../../../app/repositories/invitation-link.repository';
import { InvitationLink } from '../../../models/invitation-link';
import { congregationMock } from './congregation.mock';
import { RoleEnum } from '../../../models/enums/role';
import { mockBuilderFn } from '../utils';

// MOCK CLASSES
export class InvitationLinkRepositoryMock implements InvitationLinkRepository {
  getById(id: string): Observable<InvitationLink | undefined> {
    return of(mockBuilderFn(invitationLinkMock, { id }));
  }

  add(invitationLink: Omit<InvitationLink, 'id'>): Observable<InvitationLink> {
    return of(mockBuilderFn(invitationLinkMock, invitationLink));
  }

  update(invitationLink: Partial<InvitationLink>): Observable<void> {
    return EMPTY;
  }
}

// MOCK MODELS
export const invitationLinkMock: InvitationLink = {
  id: 'INV-123456',
  createdBy: 'user-id-123',
  congregation: congregationMock,
  createdAt: new Date('2024-01-01T12:00:00'),
  role: RoleEnum.PUBLISHER,
  isValid: true,
  email: 'user.123@test.com',
};

