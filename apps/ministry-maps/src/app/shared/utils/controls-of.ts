import { FormControl, FormGroup } from '@angular/forms';

export type ControlsOf<T extends object> = {
  [K in keyof T]: T[K] extends object ? FormGroup<ControlsOf<T[K]>> : FormControl<T[K]>;
};
