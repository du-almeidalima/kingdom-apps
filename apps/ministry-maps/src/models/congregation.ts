export type CongregationProfile = 'sign-language' | 'hearing'

export type Congregation = {
  id: string;
  name: string;
  locatedOn: string;
  cities: string[];
  profile: CongregationProfile;
};
