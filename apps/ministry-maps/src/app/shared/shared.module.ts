import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLinkWithHref } from '@angular/router';

import { CommonComponentsModule } from '@kingdom-apps/common';

import { HeaderComponent } from './components/header/header.component';

@NgModule({
  declarations: [HeaderComponent],
  imports: [CommonModule, CommonComponentsModule, RouterLinkWithHref, RouterLinkActive],
  exports: [HeaderComponent, CommonComponentsModule],
})
export class SharedModule {}
