import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLinkWithHref } from '@angular/router';

import { CardHeaderComponent } from './card/card-header/card-header.component';
import { CardBodyComponent } from './card/card-body/card-body.component';
import { CardComponent } from './card/card.component';
import { HeaderComponent } from './header/header.component';
import { FloatingActionButtonComponent } from './floating-action-btn/floating-action-button.component';
import { IconComponent } from './icon/icon.component';
import { ButtonComponent } from './button/button.component';
import { FormFieldComponent } from './form-field/form-field.component';
import { InputComponent } from './form-field/input/input.component';
import { LabelComponent } from './form-field/label/label.component';
import { SelectComponent } from './form-field/select/select.component';
import { DialogComponent } from './dialog/dialog.component';
import { DialogFooterComponent } from './dialog/dialog-footer/dialog-footer.component';

@NgModule({
  imports: [CommonModule, RouterLinkActive, RouterLinkWithHref],
  declarations: [
    HeaderComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FloatingActionButtonComponent,
    IconComponent,
    ButtonComponent,
    InputComponent,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    DialogComponent,
    DialogFooterComponent,
  ],
  exports: [
    HeaderComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FloatingActionButtonComponent,
    IconComponent,
    ButtonComponent,
    InputComponent,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    DialogComponent,
    DialogFooterComponent,
  ],
})
export class CommonComponentsModule {
}
