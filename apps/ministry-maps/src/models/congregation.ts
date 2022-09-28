import { Territory } from './territory';

export type Congregation = {
  id: string;
  name: string;
  locatedOn: string;
  cities: string[];
  territories: Territory[];
};
