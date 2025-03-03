import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkRoutesModule } from './work-routes.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoteComponent } from '@kingdom-apps/common-ui';

@NgModule({
  imports: [CommonModule, WorkRoutesModule, FormsModule, ReactiveFormsModule, NoteComponent],
})
export class WorkModule {}
