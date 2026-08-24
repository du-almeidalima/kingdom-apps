import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

export const BROWSER_WINDOW = new InjectionToken<Window | null>('BROWSER_WINDOW', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView,
});
