import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RadioGroupComponent, RadioOption } from './radio-group.component';
import { MockComponent } from 'ng-mocks';
import { IconComponent } from '../../icon/icon.component';

describe('RadioGroupComponent', () => {
  let component: RadioGroupComponent<string>;
  let fixture: ComponentFixture<RadioGroupComponent<string>>;

  const mockOptions: RadioOption<string>[] = [
    { value: 'opt1', label: 'Option 1', icon: 'settings-1', testId: 'opt-1' },
    { value: 'opt2', label: 'Option 2', description: 'Desc 2', testId: 'opt-2' },
    { value: 'opt3', label: 'Option 3', disabled: true, testId: 'opt-3' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioGroupComponent, MockComponent(IconComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(RadioGroupComponent<string>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', mockOptions);
    fixture.detectChanges();
  });

  it('should create and render options with vertical layout by default', () => {
    expect(component).toBeTruthy();
    expect(component.layout()).toBe('vertical');

    const group = fixture.nativeElement.querySelector('.lib-radio-group');
    expect(group.classList.contains('lib-radio-group--vertical')).toBe(true);

    const rendered = fixture.nativeElement.querySelectorAll('.lib-radio-option');
    expect(rendered.length).toBe(3);
  });

  it('should support horizontal and grid layouts', () => {
    fixture.componentRef.setInput('layout', 'horizontal');
    fixture.detectChanges();

    const group = fixture.nativeElement.querySelector('.lib-radio-group');
    expect(group.classList.contains('lib-radio-group--horizontal')).toBe(true);

    fixture.componentRef.setInput('layout', 'grid');
    fixture.detectChanges();
    expect(group.classList.contains('lib-radio-group--grid')).toBe(true);
  });

  it('should select an option and emit change', () => {
    const changeSpy = jest.fn();
    component.registerOnChange(changeSpy);

    component.selectOption(mockOptions[0]);
    fixture.detectChanges();

    expect(component.value()).toBe('opt1');
    expect(changeSpy).toHaveBeenCalledWith('opt1');
    expect(component.isSelected('opt1')).toBe(true);
  });

  it('should not select a disabled option', () => {
    const changeSpy = jest.fn();
    component.registerOnChange(changeSpy);

    component.selectOption(mockOptions[2]);
    fixture.detectChanges();

    expect(component.value()).toBeNull();
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it('should support writeValue from ControlValueAccessor', () => {
    component.writeValue('opt2');
    fixture.detectChanges();

    expect(component.value()).toBe('opt2');
    expect(component.isSelected('opt2')).toBe(true);
  });
});
