import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

import { grey400 } from '../../styles/abstract/variables';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'lib-search-input',
  styleUrls: ['./search-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div class='search-input'>
      <input
        class='search-input__input'
        type='search'
        placeholder='Pesquisar Território'
        aria-labelledby='search-icon'
        [formControl]='searchControl'
        #searchControlTemplate />
      <lib-icon
        icon='magnifier-lined'
        class='search-input__icon'
        id='search-icon'
        aria-label='Pesquisar Território'
        (click)='searchControlTemplate.focus()'
        [fillColor]='black' />
    </div>
  `,
})
export class SearchInputComponent implements OnInit, OnDestroy {
  black = grey400;
  searchControl = new FormControl('');
  searchControlSubscription?: Subscription;

  @Output()
  searched = new EventEmitter<string | null>();

  ngOnInit(): void {
    this.searchControlSubscription = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(search => {
        this.searched.emit(search);
      });
  }

  ngOnDestroy(): void {
    this.searchControlSubscription?.unsubscribe();
  }

  // TODO: This is not a very good approach, but I didn't have time to implement ControlValueAccessor
  // FIXME: Implement this with ControlValueAccessor
  resetSearch(emitEvent = true) {
    this.searchControl.reset('', { emitEvent });
  }
}
