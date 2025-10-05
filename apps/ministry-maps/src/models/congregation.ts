export type Congregation = {
  id: string;
  name: string;
  locatedOn: string;
  cities: string[];
  settings: CongregationSettings;
};

export type CongregationSettings = {
  /** The number of days a {@link Designation} can be accessed by a publisher. */
  designationAccessExpiryDays: number;
  /** Once a {@link Designation} is expired, should all buttons be disabled. */
  shouldDesignationBlockAfterExpired: boolean;
}
