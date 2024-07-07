import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserStateService } from '../../../state/user.state.service';
import { CongregationProfile } from '../../../../models/congregation';

/**
 * This guard will tell Angular if the route this fn is on can be accessed.
 * This is useful to define different components/modules for the same route.
 * In this project, useful to display Hearing and Sign Language components based on the User's congregation profile.
 */
export const profileMatchGuard: CanMatchFn = (route) => {
  const userState = inject(UserStateService);

  const userProfile: CongregationProfile = userState.currentUser?.congregation?.profile ?? 'sign-language';
  const profiles: string[] = route?.data?.['profiles'] ?? [];

  if (!userState) {
    return false;
  }

  // If no profiles were passed, allow everything
  if (!profiles?.length) {
    return true;
  }

  return profiles.some(profile => {
    return profile === userProfile;
  });
};
