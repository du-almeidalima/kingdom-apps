import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { TextFilterComponent } from './text-filter.component';

describe('TextFilterComponent', () => {
  let component: TextFilterComponent;
  let onChange: jest.Mock;
  let onTouched: jest.Mock;

  const render = () => {
    const fixture = MockRender(TextFilterComponent, {
      title: 'Busca',
      controlName: 'search',
      placeholder: 'Digite...',
    });
    component = fixture.point.componentInstance as TextFilterComponent;
    onChange = jest.fn();
    onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);
    return fixture;
  };

  beforeEach(() => MockBuilder(TextFilterComponent));

  it('renders the title and placeholder', () => {
    const fixture = render();

    expect(ngMocks.formatText(fixture)).toContain('Busca');
    expect(ngMocks.find(fixture, 'input').nativeElement.placeholder).toBe('Digite...');
  });

  describe('ControlValueAccessor contract', () => {
    it('writeValue sets the value, coercing null to empty string', () => {
      render();

      component.writeValue('abc');
      expect(component.value()).toBe('abc');

      component.writeValue(null as unknown as string);
      expect(component.value()).toBe('');
    });

    it('typing propagates through onChange and onTouched', () => {
      const fixture = render();

      const input = ngMocks.find(fixture, 'input').nativeElement as HTMLInputElement;
      input.value = 'abc';
      input.dispatchEvent(new Event('input'));

      expect(onChange).toHaveBeenCalledWith('abc');
      expect(onTouched).toHaveBeenCalled();
      expect(component.value()).toBe('abc');
    });

    it('setDisabledState disables the input', () => {
      const fixture = render();

      component.setDisabledState(true);
      fixture.detectChanges();

      expect(ngMocks.find(fixture, 'input').nativeElement.disabled).toBe(true);
    });
  });
});
