import { OnlyNumbersDirective } from './only-numbers.directive';
import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

describe('OnlyNumbersDirective', () => {
  @Component({
    template: `<input libOnlyNumbers id="test-input" />`,
    imports: [OnlyNumbersDirective],
  })
  class TestComponent {}

  let fixture: ComponentFixture<TestComponent>;
  let input: DebugElement;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({}).createComponent(TestComponent);

    input = fixture.debugElement.query(By.directive(OnlyNumbersDirective));
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(input).toBeTruthy();
  });

  it('should only allow numbers', () => {
    const event1 = new KeyboardEvent('keydown', { key: '1', cancelable: true });
    const event2 = new KeyboardEvent('keydown', { key: '2', cancelable: true });
    const event3 = new KeyboardEvent('keydown', { key: 'B', cancelable: true });
    const event4 = new KeyboardEvent('keydown', { key: '-', cancelable: true });

    input.nativeElement.dispatchEvent(event1);
    input.nativeElement.dispatchEvent(event2);
    input.nativeElement.dispatchEvent(event3);
    input.nativeElement.dispatchEvent(event4);

    fixture.detectChanges();

    expect(event1.defaultPrevented).toBeFalsy();
    expect(event2.defaultPrevented).toBeFalsy();
    expect(event3.defaultPrevented).toBeTruthy();
    expect(event4.defaultPrevented).toBeTruthy();
  });
});
