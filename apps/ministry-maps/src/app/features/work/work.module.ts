import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { WorkPageComponent } from './pages/work-page/work-page.component';
import { WorkRoutesModule } from './work-routes.module';
import { WorkItemComponent } from './components/work-item/work-item.component';
import { WorkItemCompleteDialogComponent } from './components/work-item-complete-dialog/work-item-complete-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    WorkPageComponent,
    WorkItemComponent,
    WorkItemCompleteDialogComponent,
  ],
  imports: [CommonModule, SharedModule, WorkRoutesModule, FormsModule, ReactiveFormsModule],
})
export class WorkModule {}
