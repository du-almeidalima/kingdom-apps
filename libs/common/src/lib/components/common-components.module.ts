import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLinkWithHref } from '@angular/router';

import { CardHeaderComponent } from './card/card-header/card-header.component';
import { CardBodyComponent } from './card/card-body/card-body.component';
import { CardComponent } from './card/card.component';
import { HeaderComponent } from './header/header.component';

@NgModule({
  declarations: [HeaderComponent, CardComponent, CardHeaderComponent, CardBodyComponent],
  imports: [CommonModule, RouterLinkActive, RouterLinkWithHref],
  exports: [HeaderComponent, CardComponent, CardHeaderComponent, CardBodyComponent],
})
export class CommonComponentsModule {}
