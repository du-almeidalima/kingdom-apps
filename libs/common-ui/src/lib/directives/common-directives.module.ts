import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DialogCloseDirective } from './dialog-close/dialog-close.directive';

@NgModule({
  declarations: [DialogCloseDirective],
  imports: [CommonModule],
  exports: [DialogCloseDirective],
})
export class CommonDirectivesModule {}
