import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { CardComponent } from './card/card.component';

@NgModule({
  declarations: [HeaderComponent, CardComponent],
  imports: [CommonModule],
  exports: [HeaderComponent, CardComponent],
})
export class CommonComponentsModule {}
