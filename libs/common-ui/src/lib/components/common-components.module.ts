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
import { SpinnerComponent } from './spinner/spinner.component';
import { SearchInputComponent } from './search-input/search-input.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from './icon-button/icon-button.component';

@NgModule({
  imports: [CommonModule, RouterLinkActive, RouterLinkWithHref, SearchInputComponent, IconComponent],
  declarations: [
    HeaderComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FloatingActionButtonComponent,
    ButtonComponent,
    InputComponent,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    DialogComponent,
    DialogFooterComponent,
    SpinnerComponent,
    ConfirmDialogComponent,
    IconButtonComponent
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
    SpinnerComponent,
    SearchInputComponent,
    ConfirmDialogComponent,
    IconButtonComponent
  ],
})
export class CommonComponentsModule {}
