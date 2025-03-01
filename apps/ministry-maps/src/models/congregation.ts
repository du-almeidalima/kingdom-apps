export type Congregation = {
  id: string;
  name: string;
  locatedOn: string;
  cities: string[];
  settings: CongregationSettings;
};

export type CongregationSettings = {
  /** The amount of days a {@link Designation} can be accessed by a publisher. */
  designationAccessExpiryDays: number;
}
