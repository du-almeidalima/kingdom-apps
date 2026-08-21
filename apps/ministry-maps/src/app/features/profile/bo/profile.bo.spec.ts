import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom, of } from 'rxjs';

import { ProfileBO } from './profile.bo';
import { UserRepository } from '../../../repositories/user.repository';
import { UserStateService } from '../../../state/user.state.service';
import { congregationMock, congregationMock2, userMockBuilder } from '../../../../test/mocks';
import { RoleEnum } from '../../../../models/enums/role';
import { User } from '../../../../models/user';

describe('ProfileBO', () => {
  let profileBO: ProfileBO;
  let userRepository: jest.Mocked<UserRepository>;
  let userState: UserStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileBO,
        MockProvider(UserRepository, {
          getById: jest.fn(),
          update: jest.fn(),
        }),
        UserStateService,
      ],
    });

    profileBO = TestBed.inject(ProfileBO);
    userRepository = TestBed.inject(UserRepository) as jest.Mocked<UserRepository>;
    userState = TestBed.inject(UserStateService);
  });

  describe('changeUserCongregation', () => {
    it('looks the user up exactly once by id', async () => {
      const targetUser = userMockBuilder({ id: 'USER-1', role: RoleEnum.APP_ADMIN });
      userRepository.getById.mockReturnValue(of(targetUser));
      userRepository.update.mockReturnValue(of(targetUser));

      await lastValueFrom(profileBO.changeUserCongregation('USER-1', congregationMock2.id));

      expect(userRepository.getById).toHaveBeenCalledTimes(1);
      expect(userRepository.getById).toHaveBeenCalledWith('USER-1');
    });

    it.each([
      ['the user does not exist', undefined],
      ['the user has no congregation', userMockBuilder({ id: 'USER-2', congregation: undefined })],
    ])('emits null when %s', async (_desc, repoUser) => {
      userRepository.getById.mockReturnValue(of(repoUser as User | undefined));

      const result = await lastValueFrom(profileBO.changeUserCongregation('USER-2', congregationMock2.id));

      expect(result).toBeNull();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    describe('role authorization', () => {
      it.each([
        [RoleEnum.APP_ADMIN, true],
        [RoleEnum.SUPERINTENDENT, true],
        [RoleEnum.ADMIN, false],
        [RoleEnum.ELDER, false],
        [RoleEnum.ORGANIZER, false],
        [RoleEnum.PUBLISHER, false],
      ])('%s is %s to change congregations', async (role, allowed) => {
        const targetUser = userMockBuilder({ id: 'USER-3', role });
        userRepository.getById.mockReturnValue(of(targetUser));
        userRepository.update.mockReturnValue(of(targetUser));

        if (allowed) {
          const result = await lastValueFrom(profileBO.changeUserCongregation('USER-3', congregationMock2.id));
          expect(userRepository.update).toHaveBeenCalled();
          expect(result?.congregation?.id).toBe(congregationMock2.id);
        } else {
          await expect(
            lastValueFrom(profileBO.changeUserCongregation('USER-3', congregationMock2.id))
          ).rejects.toThrow('Changing congregations is not authorized by Non-Admin users.');
          expect(userRepository.update).not.toHaveBeenCalled();
        }
      });
    });

    it('persists the user with the new congregation id, keeping the original congregation object otherwise', async () => {
      const targetUser = userMockBuilder({ id: 'USER-4', role: RoleEnum.APP_ADMIN });
      userRepository.getById.mockReturnValue(of(targetUser));
      userRepository.update.mockReturnValue(of(targetUser));

      await lastValueFrom(profileBO.changeUserCongregation('USER-4', congregationMock2.id));

      const persistedUser = userRepository.update.mock.calls[0][0];
      expect(persistedUser.congregation?.id).toBe(congregationMock2.id);
      expect(persistedUser.congregation?.name).toBe(congregationMock.name);
    });

    it('notifies the app state with the updated user returned by the repository', async () => {
      const targetUser = userMockBuilder({ id: 'USER-5', role: RoleEnum.APP_ADMIN });
      const updatedUser = userMockBuilder({ id: 'USER-5', congregation: congregationMock2 });
      userRepository.getById.mockReturnValue(of(targetUser));
      userRepository.update.mockReturnValue(of(updatedUser));

      const result = await lastValueFrom(profileBO.changeUserCongregation('USER-5', congregationMock2.id));

      expect(userState.currentUser).toBe(updatedUser);
      expect(result).toBe(updatedUser);
    });

    it('does not notify the app state when the repository emits a falsy user', async () => {
      const targetUser = userMockBuilder({ id: 'USER-6', role: RoleEnum.APP_ADMIN });
      userRepository.getById.mockReturnValue(of(targetUser));
      userRepository.update.mockReturnValue(of(undefined as unknown as User));

      await lastValueFrom(profileBO.changeUserCongregation('USER-6', congregationMock2.id));

      expect(userState.currentUser).toBeNull();
    });
  });
});
