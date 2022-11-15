import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { WorkPageComponent } from './pages/work-page/work-page.component';
import { WorkRoutesModule } from './work-routes.module';
import { WorkItemComponent } from './components/work-item/work-item.component';
import { WorkItemCompleteDialogComponent } from './components/work-item-complete-dialog/work-item-complete-dialog.component';
import { VisitOutcomeOptionComponent } from './components/visit-outcome-option/visit-outcome-option.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WorkItemHistoryDialogComponent } from './components/work-item-history-dialog/work-item-history-dialog.component';

@NgModule({
  declarations: [
    WorkPageComponent,
    WorkItemComponent,
    WorkItemCompleteDialogComponent,
    VisitOutcomeOptionComponent,
    WorkItemHistoryDialogComponent,
  ],
  imports: [CommonModule, SharedModule, WorkRoutesModule, FormsModule, ReactiveFormsModule],
})
export class WorkModule {}
