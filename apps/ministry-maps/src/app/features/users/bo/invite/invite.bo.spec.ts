import { TestBed } from '@angular/core/testing';
import { InviteBO } from './invite-bo.service';
import { MockProvider, ngMocks } from 'ng-mocks';
import { InvitationLinkRepository } from '../../../../repositories/invitation-link.repository';
import { RoleEnum } from '../../../../../models/enums/role';
import { InvitationLink } from '../../../../../models/invitation-link';
import { of } from 'rxjs';
import { elderUser, publisherUser } from '../../../../../test/mocks';
import { UserStateService } from '../../../../state/user.state.service';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { LoggerService } from '../../../../shared/services/logger/logger.service';

describe('InviteBO', () => {
  let service: InviteBO;
  let inviteRepository: jest.Mocked<InvitationLinkRepository>;
  let userStateService: UserStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...MOCK_REPOSITORIES_PROVIDERS,
        InviteBO,
        MockProvider(UserStateService),
        MockProvider(LoggerService),
        MockProvider(InvitationLinkRepository, {
          add: jest.fn(),
          update: jest.fn(),
        }),
      ],
    });

    service = TestBed.inject(InviteBO);
    inviteRepository = ngMocks.get(InvitationLinkRepository) as jest.Mocked<InvitationLinkRepository>;
    userStateService = ngMocks.get(UserStateService);
    userStateService.setUser(elderUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createInviteLink', () => {
    it('should create invitation link with email', () => {
      const expectedInviteData = {
        createdAt: expect.any(Date),
        role: RoleEnum.PUBLISHER,
        isValid: true,
        createdBy: elderUser.email,
        congregation: elderUser.congregation,
        email: publisherUser.email,
      };

      inviteRepository.add.mockReturnValue(
        of({
          ...expectedInviteData,
          id: 'invite123',
        } as InvitationLink)
      );

      let result: InvitationLink | undefined;

      service
        .createInviteLink({
          email: publisherUser.email,
          role: RoleEnum.PUBLISHER,
        })
        .subscribe((inviteLink) => {
          result = inviteLink;
        });

      expect(inviteRepository.add).toHaveBeenCalledWith(expect.objectContaining(expectedInviteData));
      expect(result).toEqual(expect.objectContaining({ id: 'invite123' }));
    });

    it('should create invitation link without email', () => {
      const expectedInviteData = {
        createdAt: expect.any(Date),
        role: RoleEnum.ELDER,
        isValid: true,
        createdBy: elderUser.email,
        congregation: elderUser.congregation,
        email: undefined,
      };

      inviteRepository.add.mockReturnValue(
        of({
          ...expectedInviteData,
          id: 'invite123',
        } as InvitationLink)
      );

      let result: InvitationLink | undefined;

      service.createInviteLink({ email: undefined, role: RoleEnum.ELDER }).subscribe((inviteLink) => {
        result = inviteLink;
      });

      expect(inviteRepository.add).toHaveBeenCalledWith(expect.objectContaining(expectedInviteData));
      expect(result).toEqual(expect.objectContaining({ id: 'invite123' }));
    });

    it('should return EMPTY when user has no congregation', () => {
      const userState = ngMocks.get(UserStateService);
      userState.setUser(null);

      let subscribed = false;
      service.createInviteLink({ role: RoleEnum.PUBLISHER }).subscribe(() => {
        subscribed = true;
      });

      expect(subscribed).toBe(false);
      expect(inviteRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('consumeInviteLink', () => {
    const mockInvitationLink: InvitationLink = {
      id: 'invite123',
      createdBy: elderUser.email,
      congregation: publisherUser.congregation!,
      createdAt: new Date(),
      role: RoleEnum.PUBLISHER,
      isValid: true,
    };

    it('should mark the invite link as consumed', () => {
      const inviteToConsume = { ...mockInvitationLink };
      inviteRepository.update.mockReturnValue(of(void 0));

      service.consumeInviteLink(inviteToConsume).subscribe();

      expect(inviteRepository.update).toHaveBeenCalledWith(inviteToConsume);
    });

    it('should handle the case when user is not logged in', () => {
      const inviteToConsume = { ...mockInvitationLink };
      inviteRepository.update.mockReturnValue(of(void 0));
      userStateService.setUser(null);

      service.consumeInviteLink(inviteToConsume).subscribe();

      expect(inviteToConsume.isValid).toBe(false);
      expect(inviteToConsume.usedAt).toBeInstanceOf(Date);
      expect(inviteToConsume.usedBy).toBeUndefined();
      expect(inviteRepository.update).toHaveBeenCalledWith(inviteToConsume);
    });
  });
});
