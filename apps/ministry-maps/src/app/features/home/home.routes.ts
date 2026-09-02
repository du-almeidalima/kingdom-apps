import { Route } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';

export enum HomeRoutesEnum {
  INDEX = '',
}

export const HOME_ROUTES: Route[] = [
  {
    path: HomeRoutesEnum.INDEX,
    component: HomePageComponent,
  },
];
