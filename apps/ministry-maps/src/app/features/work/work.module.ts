import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { WorkPageComponent } from './pages/work-page/work-page.component';
import { WorkControlsComponent } from './pages/components/work-controls/work-controls.component';
import { WorkRoutesModule } from './work-routes.module';
import { WorkItemComponent } from './components/work-item/work-item.component';

@NgModule({
  declarations: [WorkPageComponent, WorkControlsComponent, WorkItemComponent],
  imports: [CommonModule, SharedModule, WorkRoutesModule],
})
export class WorkModule {}
