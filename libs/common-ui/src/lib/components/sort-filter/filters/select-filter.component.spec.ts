import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { SelectFilterComponent } from './select-filter.component';

describe('SelectFilterComponent', () => {
  let component: SelectFilterComponent;
  let onChange: jest.Mock;
  let onTouched: jest.Mock;

  const render = () => {
    const fixture = MockRender(SelectFilterComponent, {
      title: 'Cidade',
      controlName: 'city',
      placeholder: 'Todas',
      options: [
        { value: 'A', label: 'City A' },
        { value: 'B', label: 'City B' },
      ],
    });
    component = fixture.point.componentInstance as SelectFilterComponent;
    onChange = jest.fn();
    onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);
    return fixture;
  };

  beforeEach(() => MockBuilder(SelectFilterComponent));

  it('renders the title, placeholder option and the provided options', () => {
    const fixture = render();

    expect(ngMocks.formatText(fixture)).toContain('Cidade');
    const optionTexts = ngMocks.findAll(fixture, 'option').map((el) => el.nativeElement.textContent.trim());
    expect(optionTexts).toEqual(['Todas', 'City A', 'City B']);
  });

  describe('ControlValueAccessor contract', () => {
    it('writeValue sets the value, coercing null to the empty option', () => {
      render();

      component.writeValue('B');
      expect(component.value()).toBe('B');

      component.writeValue(null);
      expect(component.value()).toBe('');
    });

    it('selecting an option propagates through onChange and onTouched', () => {
      const fixture = render();

      const select = ngMocks.find(fixture, 'select').nativeElement as HTMLSelectElement;
      select.value = 'B';
      select.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith('B');
      expect(onTouched).toHaveBeenCalled();
      expect(component.value()).toBe('B');
    });

    it('setDisabledState disables the select element', () => {
      const fixture = render();

      component.setDisabledState(true);
      fixture.detectChanges();

      expect(ngMocks.find(fixture, 'select').nativeElement.disabled).toBe(true);
    });
  });
});
