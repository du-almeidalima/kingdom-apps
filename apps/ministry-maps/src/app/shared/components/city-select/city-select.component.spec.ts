import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { CitySelectComponent } from './city-select.component';
import { ALL_OPTION } from '../../utils/territories-filter-pipe';

describe('CitySelectComponent', () => {
  let component: CitySelectComponent;
  let onChange: jest.Mock;
  let onTouched: jest.Mock;

  const render = (overrides: Partial<{ cities: string[]; includeAll: boolean; testId: string | null }> = {}) => {
    const fixture = MockRender(
      CitySelectComponent,
      {
        cities: overrides.cities ?? ['São Paulo', 'Osasco'],
        includeAll: overrides.includeAll ?? true,
        testId: overrides.testId ?? 'city-select-test',
      },
      { reset: true }
    );
    component = fixture.point.componentInstance;
    onChange = jest.fn();
    onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);
    return fixture;
  };

  beforeEach(() => MockBuilder(CitySelectComponent));

  it('renders all cities and the Todas option by default', () => {
    const fixture = render();

    const select = ngMocks.find(fixture, 'select').nativeElement as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.getAttribute('data-testid')).toBe('city-select-test');

    const options = Array.from(select.options);
    expect(options.map((o) => o.value)).toEqual(['São Paulo', 'Osasco', ALL_OPTION]);
    expect(options.map((o) => o.text.trim())).toEqual(['São Paulo', 'Osasco', 'Todas']);
  });

  it('omits the Todas option when includeAll is false', () => {
    const fixture = render({ includeAll: false });

    const select = ngMocks.find(fixture, 'select').nativeElement as HTMLSelectElement;
    const options = Array.from(select.options);
    expect(options.map((o) => o.value)).toEqual(['São Paulo', 'Osasco']);
  });

  describe('ControlValueAccessor contract', () => {
    it('writeValue sets the value', () => {
      const fixture = render();

      component.writeValue('Osasco');
      fixture.detectChanges();

      expect(component.value()).toBe('Osasco');
      const select = ngMocks.find(fixture, 'select').nativeElement as HTMLSelectElement;
      expect(select.value).toBe('Osasco');
    });

    it('writeValue coerces null or undefined to empty string', () => {
      render();

      component.writeValue(null as unknown as string);
      expect(component.value()).toBe('');

      component.writeValue(undefined as unknown as string);
      expect(component.value()).toBe('');
    });

    it('user selection change propagates through onChange and onTouched', () => {
      const fixture = render();

      const select = ngMocks.find(fixture, 'select').nativeElement as HTMLSelectElement;
      select.value = 'Osasco';
      select.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith('Osasco');
      expect(onTouched).toHaveBeenCalled();
      expect(component.value()).toBe('Osasco');
    });

    it('setDisabledState disables the select element', () => {
      const fixture = render();

      component.setDisabledState(true);
      fixture.detectChanges();

      const select = ngMocks.find(fixture, 'select').nativeElement as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });

    it('disabled model input disables the select element', () => {
      const fixture = MockRender(
        CitySelectComponent,
        {
          cities: ['São Paulo', 'Osasco'],
          disabled: true,
        },
        { reset: true }
      );

      const select = ngMocks.find(fixture, 'select').nativeElement as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });
  });
});
