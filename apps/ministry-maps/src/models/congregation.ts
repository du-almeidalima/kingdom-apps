import { Territory } from './territory';

export type Congregation = {
  name: string;
  locatedOn: string;
  cities: string[];
  territories: Territory[];
};
