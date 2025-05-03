import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[libOnlyNumbers]',
})
export class OnlyNumbersDirective {
  @Input() decimal = false;
  @Input() negative = false;

  constructor(private el: ElementRef) {}

  @HostListener('keydown', ['$event'])
  onKeyPress(event: KeyboardEvent) {
    // Get the character that would be added
    const charCode = event.key.charCodeAt(0);
    const charStr = String.fromCharCode(charCode);

    // Define the allowed characters
    let pattern: RegExp;

    if (this.decimal && this.negative) {
      // Allow digits, decimal point, and negative sign
      pattern = /[\d.-]/;

      // Prevent multiple decimal points
      if (charStr === '.' && this.el.nativeElement.value.includes('.')) {
        event.preventDefault();
        return;
      }

      // Prevent negative sign if not at the beginning
      if (charStr === '-' && this.el.nativeElement.value.length > 0) {
        event.preventDefault();
        return;
      }
    } else if (this.decimal) {
      // Allow digits and decimal point
      pattern = /[\d.]/;

      // Prevent multiple decimal points
      if (charStr === '.' && this.el.nativeElement.value.includes('.')) {
        event.preventDefault();
        return;
      }
    } else if (this.negative) {
      // Allow digits and negative sign
      pattern = /[\d-]/;

      // Prevent negative sign if not at the beginning
      if (charStr === '-' && this.el.nativeElement.value.length > 0) {
        event.preventDefault();
        return;
      }
    } else {
      // Allow only digits
      pattern = /\d/;
    }

    // Prevent the keypress if it doesn't match the pattern
    if (!pattern.test(charStr)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    // Get the pasted text
    const pastedText = event.clipboardData?.getData('text');

    if (!pastedText) return;

    let regExp: RegExp;
    if (this.decimal && this.negative) {
      regExp = new RegExp('^-?\\d*(\\.\\d*)?$');
    } else if (this.decimal) {
      regExp = new RegExp('^\\d*(\\.\\d*)?$');
    } else if (this.negative) {
      regExp = new RegExp('^-?\\d*$');
    } else {
      regExp = new RegExp('^\\d*$');
    }

    // If the pasted text doesn't match the pattern, prevent the paste action
    if (!regExp.test(pastedText)) {
      event.preventDefault();
    }
  }
}
