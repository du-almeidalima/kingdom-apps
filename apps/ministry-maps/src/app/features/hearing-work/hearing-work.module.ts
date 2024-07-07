import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { HearingWorkPageComponent } from './pages/hearing-work-page/hearing-work-page.component';
import { HearingWorkRoutesModule } from './hearing-work-routes.module';

@NgModule({
  declarations: [HearingWorkPageComponent],
  imports: [HearingWorkRoutesModule, CommonModule, SharedModule],
})
export class HearingWorkModule {}
