import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom } from 'rxjs';

import { InviteBO } from './invite-bo.service';
import { InvitationLinkRepository } from '../../../../repositories/invitation-link.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { congregationMock, userMockBuilder } from '../../../../../test/mocks';
import { InvitationLink } from '../../../../../models/invitation-link';
import { RoleEnum } from '../../../../../models/enums/role';
import { of } from 'rxjs';

describe('InviteBO', () => {
  let inviteBO: InviteBO;
  let inviteRepository: jest.Mocked<InvitationLinkRepository>;
  let userState: UserStateService;
  let loggerService: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InviteBO,
        MockProvider(InvitationLinkRepository, {
          add: jest.fn(),
        }),
        MockProvider(LoggerService),
        {
          provide: UserStateService,
          useFactory: () => {
            const userStateServiceMock = new UserStateService();
            userStateServiceMock.setUser(userMockBuilder({ congregation: congregationMock }));

            return userStateServiceMock;
          },
        },
      ],
    });

    inviteBO = TestBed.inject(InviteBO);
    inviteRepository = TestBed.inject(InvitationLinkRepository) as jest.Mocked<InvitationLinkRepository>;
    userState = TestBed.inject(UserStateService);
    loggerService = TestBed.inject(LoggerService);
  });

  describe('createInviteLink', () => {
    it.each([
      ['no user', null],
      ['user without congregation', userMockBuilder({ congregation: undefined })],
    ])(
      'completes without emitting and does not hit the repository when there is %s',
      (_desc, user) => {
        userState.setUser(user);

        let completed = false;
        const emitted: InvitationLink[] = [];
        inviteBO.createInviteLink({ role: RoleEnum.PUBLISHER }).subscribe({
          next: link => emitted.push(link),
          complete: () => (completed = true),
        });

        expect(emitted).toEqual([]);
        expect(completed).toBe(true);
        expect(inviteRepository.add).not.toHaveBeenCalled();
        expect(loggerService.error).toHaveBeenCalled();
      }
    );

    it('persists a valid invitation link payload and emits the created link', async () => {
      const createdLink: InvitationLink = { id: 'INVITE-1' } as InvitationLink;
      inviteRepository.add.mockReturnValue(of(createdLink));

      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 5, 15));

      const result = await lastValueFrom(inviteBO.createInviteLink({ email: 'invited@email.com', role: RoleEnum.ELDER }));

      expect(inviteRepository.add).toHaveBeenCalledTimes(1);
      const payload = inviteRepository.add.mock.calls[0][0];
      expect(payload).toEqual({
        createdAt: new Date(2024, 5, 15),
        role: RoleEnum.ELDER,
        isValid: true,
        createdBy: userMockBuilder({ congregation: congregationMock }).email,
        congregation: congregationMock,
        email: 'invited@email.com',
      });
      expect(result).toBe(createdLink);
    });

    it('stores a null email as undefined', async () => {
      inviteRepository.add.mockReturnValue(of({ id: 'INVITE-2' } as InvitationLink));

      await lastValueFrom(inviteBO.createInviteLink({ email: null, role: RoleEnum.PUBLISHER }));

      expect(inviteRepository.add.mock.calls[0][0].email).toBeUndefined();
    });

    it('logs an info entry with the created link id on success', async () => {
      inviteRepository.add.mockReturnValue(of({ id: 'INVITE-3' } as InvitationLink));

      await lastValueFrom(inviteBO.createInviteLink({ role: RoleEnum.PUBLISHER }));

      expect(loggerService.info).toHaveBeenCalledWith(expect.stringContaining('INVITE-3'));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
