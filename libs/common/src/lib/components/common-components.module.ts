import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { CardComponent } from './card/card.component';
import { RouterLinkActive } from '@angular/router';
import { CardHeaderComponent } from './card/card-header/card-header.component';
import { CardBodyComponent } from './card/card-body/card-body.component';

@NgModule({
  declarations: [HeaderComponent, CardComponent, CardHeaderComponent, CardBodyComponent],
  imports: [CommonModule, RouterLinkActive],
  exports: [HeaderComponent, CardComponent, CardHeaderComponent, CardBodyComponent],
})
export class CommonComponentsModule {}
