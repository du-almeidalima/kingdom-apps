import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DialogComponent, DialogFooterComponent } from '../../dialog';
import { ButtonComponent } from '../../button/button.component';
import { SelectComponent } from '../../form-field';
import { FormFieldComponent } from '../../form-field';
import { LabelComponent } from '../../form-field';
import { FilterConfig, SortFilterConfig, SortFilterValue } from '../types/sort-filter.model';
import { SelectFilterComponent } from '../filters/select-filter.component';
import { ToggleFilterComponent } from '../filters/toggle-filter.component';
import { TextFilterComponent } from '../filters/text-filter.component';

@Component({
  selector: 'lib-sort-filter-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogComponent,
    DialogFooterComponent,
    ButtonComponent,
    SelectComponent,
    FormFieldComponent,
    LabelComponent,
    SelectFilterComponent,
    ToggleFilterComponent,
    TextFilterComponent,
  ],
  styleUrls: ['./sort-filter-dialog.component.scss'],
  templateUrl: './sort-filter-dialog.component.html',
})
export class SortFilterDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(DialogRef<SortFilterValue>);
  readonly data = inject<SortFilterConfig>(DIALOG_DATA);

  form!: FormGroup;
  filterConfigEntries = signal<[string, FilterConfig][]>([]);

  ngOnInit(): void {
    const filtersGroup = this.fb.group({});

    if (this.data.filterConfigs) {
      const entries = Object.entries(this.data.filterConfigs.options);
      this.filterConfigEntries.set(entries);

      entries.forEach(([key, config]) => {
        const configInitial = this.data.filterConfigs?.initial?.[key] ?? (config.filterType === 'toggle' ? false : '');

        filtersGroup.addControl(key, this.fb.control(configInitial));
      });
    }

    this.form = this.fb.group({
      sort: [this.data.sortConfigs?.initial ?? ''],
      filters: filtersGroup,
    });
  }

  handleApply() {
    this.dialogRef.close(this.form.value);
  }

  handleCancel() {
    this.dialogRef.close();
  }
}
