import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { IconComponent } from '../icon/icon.component';
import { MultiSelectChipsComponent, MultiSelectOption } from './multi-select-chips.component';

@Component({
  template: `<lib-multi-select-chips aria-label="Cidades" [options]="options" [(selected)]="selected" />`,
  imports: [MultiSelectChipsComponent],
})
class MultiSelectHostComponent {
  readonly options: MultiSelectOption[] = [
    { value: 'SP', label: 'São Paulo' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'MG', label: 'Minas Gerais' },
  ];
  selected: string[] = [];
}

@Component({
  template: `
    <lib-multi-select-chips
      aria-label="Cidades"
      [options]="options"
      [formControl]="control"
    />
  `,
  imports: [MultiSelectChipsComponent, ReactiveFormsModule],
})
class ReactiveFormsHostComponent {
  readonly options: MultiSelectOption[] = [
    { value: 'SP', label: 'São Paulo' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'MG', label: 'Minas Gerais' },
  ];
  readonly control = new FormControl<string[]>([], { nonNullable: true });
}

describe('MultiSelectChipsComponent', () => {
  beforeEach(() =>
    MockBuilder([
      MultiSelectChipsComponent,
      IconComponent,
      MultiSelectHostComponent,
      ReactiveFormsHostComponent,
      ReactiveFormsModule,
    ]),
  );

  const option = (fixture: ReturnType<typeof MockRender>, value: string) =>
    ngMocks.find(fixture, `[data-testid="multi-select-chips-option-${value}"]`).nativeElement as HTMLInputElement;

  const checkedStates = (fixture: ReturnType<typeof MockRender>) =>
    ['SP', 'RJ', 'MG'].map((value) => option(fixture, value).checked);

  const icons = (fixture: ReturnType<typeof MockRender>) =>
    ngMocks.findAll(fixture, IconComponent).map((icon) => icon.componentInstance.icon());

  it('renders one unchecked checkbox chip per option inside a group', () => {
    const fixture = MockRender(MultiSelectHostComponent);

    const group = ngMocks.find(fixture, MultiSelectChipsComponent).nativeElement as HTMLElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Cidades');

    const boxes = ngMocks.findAll(fixture, 'input[type="checkbox"]').map((box) => box.nativeElement as HTMLInputElement);
    expect(boxes.map((box) => box.value)).toEqual(['SP', 'RJ', 'MG']);
    expect(boxes.map((box) => box.labels?.[0].textContent?.trim())).toEqual(['São Paulo', 'Rio de Janeiro', 'Minas Gerais']);
    expect(checkedStates(fixture)).toEqual([false, false, false]);
    expect(icons(fixture)).toEqual(['plus-lined', 'plus-lined', 'plus-lined']);
  });

  it('checks the chips of the selected values and offers to remove them', () => {
    const fixture = MockRender(MultiSelectHostComponent);
    ngMocks.findInstance(fixture, MultiSelectHostComponent).selected = ['RJ', 'MG'];
    fixture.detectChanges();

    expect(checkedStates(fixture)).toEqual([false, true, true]);
    expect(icons(fixture)).toEqual(['plus-lined', 'x-mark-lined', 'x-mark-lined']);
  });

  it('adds a value when its chip is checked, keeping the options order', () => {
    const fixture = MockRender(MultiSelectHostComponent);
    const host = ngMocks.findInstance(fixture, MultiSelectHostComponent);

    option(fixture, 'MG').click();
    option(fixture, 'SP').click();
    fixture.detectChanges();

    expect(host.selected).toEqual(['SP', 'MG']);
    expect(checkedStates(fixture)).toEqual([true, false, true]);
  });

  it('removes a value when its chip is unchecked', () => {
    const fixture = MockRender(MultiSelectHostComponent);
    const host = ngMocks.findInstance(fixture, MultiSelectHostComponent);
    host.selected = ['RJ'];
    fixture.detectChanges();

    option(fixture, 'RJ').click();
    fixture.detectChanges();

    expect(host.selected).toEqual([]);
    expect(checkedStates(fixture)).toEqual([false, false, false]);
    expect(icons(fixture)).toEqual(['plus-lined', 'plus-lined', 'plus-lined']);
  });

  describe('ControlValueAccessor & Angular Forms', () => {
    it('initializes from the form control and writes new values on programmatic changes', () => {
      const fixture = MockRender(ReactiveFormsHostComponent);
      const host = ngMocks.findInstance(fixture, ReactiveFormsHostComponent);

      host.control.setValue(['RJ', 'MG']);
      fixture.detectChanges();

      expect(checkedStates(fixture)).toEqual([false, true, true]);
      expect(icons(fixture)).toEqual(['plus-lined', 'x-mark-lined', 'x-mark-lined']);

      host.control.setValue([]);
      fixture.detectChanges();

      expect(checkedStates(fixture)).toEqual([false, false, false]);
      expect(icons(fixture)).toEqual(['plus-lined', 'plus-lined', 'plus-lined']);
    });

    it('propagates value changes and marks control dirty when chip is clicked', () => {
      const fixture = MockRender(ReactiveFormsHostComponent);
      const host = ngMocks.findInstance(fixture, ReactiveFormsHostComponent);

      expect(host.control.dirty).toBe(false);
      expect(host.control.value).toEqual([]);

      option(fixture, 'SP').click();
      fixture.detectChanges();

      expect(host.control.value).toEqual(['SP']);
      expect(host.control.dirty).toBe(true);

      option(fixture, 'MG').click();
      fixture.detectChanges();

      expect(host.control.value).toEqual(['SP', 'MG']);
    });

    it('marks control touched on focusout when focus leaves the component', () => {
      const fixture = MockRender(ReactiveFormsHostComponent);
      const host = ngMocks.findInstance(fixture, ReactiveFormsHostComponent);

      expect(host.control.touched).toBe(false);

      const group = ngMocks.find(fixture, MultiSelectChipsComponent);
      group.nativeElement.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }));
      fixture.detectChanges();

      expect(host.control.touched).toBe(true);
    });

    it('disables the chips when the form control is disabled', () => {
      const fixture = MockRender(ReactiveFormsHostComponent);
      const host = ngMocks.findInstance(fixture, ReactiveFormsHostComponent);

      host.control.disable();
      fixture.detectChanges();

      const boxes = ngMocks.findAll(fixture, 'input[type="checkbox"]').map((box) => box.nativeElement as HTMLInputElement);
      expect(boxes.every((box) => box.disabled)).toBe(true);

      // Clicking disabled chip does not mutate the form control value
      option(fixture, 'SP').click();
      fixture.detectChanges();

      expect(host.control.value).toEqual([]);
    });
  });
});
