import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { ToggleFilterComponent } from './toggle-filter.component';

describe('ToggleFilterComponent', () => {
  let component: ToggleFilterComponent;
  let onChange: jest.Mock;
  let onTouched: jest.Mock;

  const render = (inputs: { icon?: string; secondaryText?: string } = {}) => {
    const fixture = MockRender(ToggleFilterComponent, {
      title: 'Mostrar tudo',
      controlName: 'showAll',
      ...inputs,
    });
    component = fixture.point.componentInstance as ToggleFilterComponent;
    onChange = jest.fn();
    onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);
    return fixture;
  };

  beforeEach(() => MockBuilder(ToggleFilterComponent));

  it('renders the title, and only shows icon/secondary text when provided', () => {
    const fixture = render({ icon: 'filter-down-lined', secondaryText: 'texto secundário' });

    expect(ngMocks.formatText(fixture)).toContain('Mostrar tudo');
    expect(ngMocks.find(fixture, 'lib-icon', undefined)).toBeTruthy();
    expect(ngMocks.formatText(fixture)).toContain('texto secundário');

    const bare = render({});
    expect(ngMocks.find(bare, 'lib-icon', undefined)).toBeUndefined();
    expect(ngMocks.findAll(bare, '.toggle-secondary')).toHaveLength(0);
  });

  describe('ControlValueAccessor contract', () => {
    it('writeValue sets the boolean, coercing null to false', () => {
      render();

      component.writeValue(true);
      expect(component.value()).toBe(true);

      component.writeValue(null as unknown as boolean);
      expect(component.value()).toBe(false);
    });

    it('toggling the checkbox propagates through onChange and onTouched', () => {
      const fixture = render();

      const input = ngMocks.find(fixture, 'input[type="checkbox"]').nativeElement as HTMLInputElement;
      input.checked = true;
      input.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith(true);
      expect(onTouched).toHaveBeenCalled();
      expect(component.value()).toBe(true);
    });

    it('setDisabledState disables the input and styles the container', () => {
      const fixture = render();

      component.setDisabledState(true);
      fixture.detectChanges();

      expect(ngMocks.find(fixture, 'input').nativeElement.disabled).toBe(true);
      expect(ngMocks.find(fixture, '.toggle-container').classes['toggle-container--disabled']).toBe(true);
    });
  });
});
