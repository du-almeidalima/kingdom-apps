import { OnlyNumbersDirective } from './only-numbers.directive';
import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

describe('OnlyNumbersDirective', () => {
  @Component({
    template: `
      <input libOnlyNumbers id="test-input-basic" />
      <input libOnlyNumbers [decimal]="true" id="test-input-decimal" />
      <input libOnlyNumbers [negative]="true" id="test-input-negative" />
      <input libOnlyNumbers [decimal]="true" [negative]="true" id="test-input-both" />
    `,
    imports: [OnlyNumbersDirective],
  })
  class TestComponent {}

  let fixture: ComponentFixture<TestComponent>;
  let basicInput: DebugElement;
  let decimalInput: DebugElement;
  let negativeInput: DebugElement;
  let bothInput: DebugElement;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({}).createComponent(TestComponent);

    basicInput = fixture.debugElement.query(By.css('#test-input-basic'));
    decimalInput = fixture.debugElement.query(By.css('#test-input-decimal'));
    negativeInput = fixture.debugElement.query(By.css('#test-input-negative'));
    bothInput = fixture.debugElement.query(By.css('#test-input-both'));
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(basicInput).toBeTruthy();
    expect(decimalInput).toBeTruthy();
    expect(negativeInput).toBeTruthy();
    expect(bothInput).toBeTruthy();
  });

  it('should only allow numbers for basic input', () => {
    const event1 = new KeyboardEvent('keydown', { key: '1', cancelable: true });
    const event2 = new KeyboardEvent('keydown', { key: '2', cancelable: true });
    const event3 = new KeyboardEvent('keydown', { key: 'B', cancelable: true });
    const event4 = new KeyboardEvent('keydown', { key: '-', cancelable: true });

    basicInput.nativeElement.dispatchEvent(event1);
    basicInput.nativeElement.dispatchEvent(event2);
    basicInput.nativeElement.dispatchEvent(event3);
    basicInput.nativeElement.dispatchEvent(event4);

    fixture.detectChanges();

    expect(event1.defaultPrevented).toBeFalsy();
    expect(event2.defaultPrevented).toBeFalsy();
    expect(event3.defaultPrevented).toBeTruthy();
    expect(event4.defaultPrevented).toBeTruthy();
  });

  describe('Special Keys (Navigation and Editing)', () => {
    it('should allow Backspace and Delete keys', () => {
      const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true });

      basicInput.nativeElement.dispatchEvent(backspaceEvent);
      basicInput.nativeElement.dispatchEvent(deleteEvent);

      expect(backspaceEvent.defaultPrevented).toBeFalsy();
      expect(deleteEvent.defaultPrevented).toBeFalsy();
    });

    it('should allow Tab, Escape, and Enter keys', () => {
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

      basicInput.nativeElement.dispatchEvent(tabEvent);
      basicInput.nativeElement.dispatchEvent(escapeEvent);
      basicInput.nativeElement.dispatchEvent(enterEvent);

      expect(tabEvent.defaultPrevented).toBeFalsy();
      expect(escapeEvent.defaultPrevented).toBeFalsy();
      expect(enterEvent.defaultPrevented).toBeFalsy();
    });

    it('should allow Home and End keys', () => {
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home', cancelable: true });
      const endEvent = new KeyboardEvent('keydown', { key: 'End', cancelable: true });

      basicInput.nativeElement.dispatchEvent(homeEvent);
      basicInput.nativeElement.dispatchEvent(endEvent);

      expect(homeEvent.defaultPrevented).toBeFalsy();
      expect(endEvent.defaultPrevented).toBeFalsy();
    });

    it('should allow arrow keys', () => {
      const arrowLeftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
      const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });

      basicInput.nativeElement.dispatchEvent(arrowLeftEvent);
      basicInput.nativeElement.dispatchEvent(arrowRightEvent);
      basicInput.nativeElement.dispatchEvent(arrowUpEvent);
      basicInput.nativeElement.dispatchEvent(arrowDownEvent);

      expect(arrowLeftEvent.defaultPrevented).toBeFalsy();
      expect(arrowRightEvent.defaultPrevented).toBeFalsy();
      expect(arrowUpEvent.defaultPrevented).toBeFalsy();
      expect(arrowDownEvent.defaultPrevented).toBeFalsy();
    });
  });

  describe('Ctrl/Cmd Key Combinations', () => {
    it('should allow Ctrl key combinations', () => {
      const ctrlAEvent = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, cancelable: true });
      const ctrlCEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, cancelable: true });
      const ctrlVEvent = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, cancelable: true });
      const ctrlXEvent = new KeyboardEvent('keydown', { key: 'x', ctrlKey: true, cancelable: true });
      const ctrlZEvent = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });

      basicInput.nativeElement.dispatchEvent(ctrlAEvent);
      basicInput.nativeElement.dispatchEvent(ctrlCEvent);
      basicInput.nativeElement.dispatchEvent(ctrlVEvent);
      basicInput.nativeElement.dispatchEvent(ctrlXEvent);
      basicInput.nativeElement.dispatchEvent(ctrlZEvent);

      expect(ctrlAEvent.defaultPrevented).toBeFalsy();
      expect(ctrlCEvent.defaultPrevented).toBeFalsy();
      expect(ctrlVEvent.defaultPrevented).toBeFalsy();
      expect(ctrlXEvent.defaultPrevented).toBeFalsy();
      expect(ctrlZEvent.defaultPrevented).toBeFalsy();
    });

    it('should allow Cmd key combinations (Mac)', () => {
      const cmdAEvent = new KeyboardEvent('keydown', { key: 'a', metaKey: true, cancelable: true });
      const cmdCEvent = new KeyboardEvent('keydown', { key: 'c', metaKey: true, cancelable: true });
      const cmdVEvent = new KeyboardEvent('keydown', { key: 'v', metaKey: true, cancelable: true });

      basicInput.nativeElement.dispatchEvent(cmdAEvent);
      basicInput.nativeElement.dispatchEvent(cmdCEvent);
      basicInput.nativeElement.dispatchEvent(cmdVEvent);

      expect(cmdAEvent.defaultPrevented).toBeFalsy();
      expect(cmdCEvent.defaultPrevented).toBeFalsy();
      expect(cmdVEvent.defaultPrevented).toBeFalsy();
    });
  });

  describe('Decimal Configuration', () => {
    it('should allow decimal point when decimal is true', () => {
      const decimalEvent = new KeyboardEvent('keydown', { key: '.', cancelable: true });
      const digitEvent = new KeyboardEvent('keydown', { key: '5', cancelable: true });

      decimalInput.nativeElement.dispatchEvent(decimalEvent);
      decimalInput.nativeElement.dispatchEvent(digitEvent);

      expect(decimalEvent.defaultPrevented).toBeFalsy();
      expect(digitEvent.defaultPrevented).toBeFalsy();
    });

    it('should prevent multiple decimal points', () => {
      decimalInput.nativeElement.value = '12.34';
      const secondDecimalEvent = new KeyboardEvent('keydown', { key: '.', cancelable: true });

      decimalInput.nativeElement.dispatchEvent(secondDecimalEvent);

      expect(secondDecimalEvent.defaultPrevented).toBeTruthy();
    });
  });

  describe('Negative Configuration', () => {
    it('should allow negative sign when negative is true', () => {
      const negativeEvent = new KeyboardEvent('keydown', { key: '-', cancelable: true });
      const digitEvent = new KeyboardEvent('keydown', { key: '5', cancelable: true });

      negativeInput.nativeElement.dispatchEvent(negativeEvent);
      negativeInput.nativeElement.dispatchEvent(digitEvent);

      expect(negativeEvent.defaultPrevented).toBeFalsy();
      expect(digitEvent.defaultPrevented).toBeFalsy();
    });

    it('should prevent negative sign when not at the beginning', () => {
      negativeInput.nativeElement.value = '123';
      const negativeEvent = new KeyboardEvent('keydown', { key: '-', cancelable: true });

      negativeInput.nativeElement.dispatchEvent(negativeEvent);

      expect(negativeEvent.defaultPrevented).toBeTruthy();
    });
  });

  describe('Decimal and Negative Configuration', () => {
    it('should allow both decimal point and negative sign', () => {
      const negativeEvent = new KeyboardEvent('keydown', { key: '-', cancelable: true });
      const digitEvent = new KeyboardEvent('keydown', { key: '5', cancelable: true });
      const decimalEvent = new KeyboardEvent('keydown', { key: '.', cancelable: true });

      bothInput.nativeElement.dispatchEvent(negativeEvent);
      bothInput.nativeElement.dispatchEvent(digitEvent);
      bothInput.nativeElement.dispatchEvent(decimalEvent);

      expect(negativeEvent.defaultPrevented).toBeFalsy();
      expect(digitEvent.defaultPrevented).toBeFalsy();
      expect(decimalEvent.defaultPrevented).toBeFalsy();
    });

    it('should still allow special keys with both configurations', () => {
      const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
      const ctrlAEvent = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, cancelable: true });

      bothInput.nativeElement.dispatchEvent(backspaceEvent);
      bothInput.nativeElement.dispatchEvent(ctrlAEvent);

      expect(backspaceEvent.defaultPrevented).toBeFalsy();
      expect(ctrlAEvent.defaultPrevented).toBeFalsy();
    });
  });

  describe('Invalid Characters', () => {
    it('should prevent letters and special characters', () => {
      const letterEvent = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      const symbolEvent = new KeyboardEvent('keydown', { key: '@', cancelable: true });
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true });

      basicInput.nativeElement.dispatchEvent(letterEvent);
      basicInput.nativeElement.dispatchEvent(symbolEvent);
      basicInput.nativeElement.dispatchEvent(spaceEvent);

      expect(letterEvent.defaultPrevented).toBeTruthy();
      expect(symbolEvent.defaultPrevented).toBeTruthy();
      expect(spaceEvent.defaultPrevented).toBeTruthy();
    });
  });
});
