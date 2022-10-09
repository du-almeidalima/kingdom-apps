import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLinkWithHref } from '@angular/router';

import { CardHeaderComponent } from './card/card-header/card-header.component';
import { CardBodyComponent } from './card/card-body/card-body.component';
import { CardComponent } from './card/card.component';
import { HeaderComponent } from './header/header.component';
import { FloatingActionButtonComponent } from './floating-action-btn/floating-action-button.component';
import { IconComponent } from './icon/icon.component';

@NgModule({
  imports: [CommonModule, RouterLinkActive, RouterLinkWithHref],
  declarations: [
    HeaderComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FloatingActionButtonComponent,
    IconComponent,
  ],
  exports: [
    HeaderComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FloatingActionButtonComponent,
    IconComponent,
  ],
})
export class CommonComponentsModule {}
