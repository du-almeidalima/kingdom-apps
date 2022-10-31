import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkPageComponent } from './pages/work-page/work-page.component';

const WORK_ROUTES: Routes = [
  {
    path: `:id`,
    component: WorkPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(WORK_ROUTES)],
  exports: [RouterModule],
})
export class WorkRoutesModule {}
