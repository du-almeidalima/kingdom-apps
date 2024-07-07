import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HearingWorkPageComponent } from './pages/hearing-work-page/hearing-work-page.component';

const HEARING_WORK_ROUTES: Routes = [
  {
    path: `:id`,
    component: HearingWorkPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(HEARING_WORK_ROUTES)],
  exports: [RouterModule],
})
export class HearingWorkRoutesModule {}
