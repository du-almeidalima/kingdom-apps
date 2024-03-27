import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DialogCloseDirective } from './dialog-close/dialog-close.directive';
import { AuthorizeDirective } from './authorize/authorize.directive';

@NgModule({
  declarations: [DialogCloseDirective],
  imports: [CommonModule, AuthorizeDirective],
  exports: [DialogCloseDirective, AuthorizeDirective],
})
export class CommonDirectivesModule {
}
