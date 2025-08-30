import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[libOnlyNumbers]',
})
export class OnlyNumbersDirective {
  @Input() decimal = false;
  @Input() negative = false;

  constructor(private el: ElementRef) {}

  /**
   * Handles the key press event to allow or block specific characters based on defined criteria.
   * @see https://angular.dev/api/core/HostListener#description
   */
  @HostListener('keydown', ['$event'])
  onKeyPress(event: KeyboardEvent) {
    // Allow special keys (navigation, editing, etc.)
    const specialKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'Home',
      'End',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Clear',
      'Copy',
      'Paste',
      'Cut',
      'Undo',
      'Redo',
      'Select',
      'SelectAll',
    ];

    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z combinations
    if (event.ctrlKey || event.metaKey) {
      return true;
    }

    // Allow special keys
    if (specialKeys.includes(event.key)) {
      return true;
    }

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
        return false;
      }

      // Prevent negative sign if not at the beginning
      if (charStr === '-' && this.el.nativeElement.value.length > 0) {
        return false;
      }
    } else if (this.decimal) {
      // Allow digits and decimal point
      pattern = /[\d.]/;

      // Prevent multiple decimal points
      if (charStr === '.' && this.el.nativeElement.value.includes('.')) {
        return false;
      }
    } else if (this.negative) {
      // Allow digits and negative sign
      pattern = /[\d-]/;

      // Prevent negative sign if not at the beginning
      if (charStr === '-' && this.el.nativeElement.value.length > 0) {
        return false;
      }
    } else {
      // Allow only digits
      pattern = /\d/;
    }

    // Prevent the keypress if it doesn't match the pattern
    return pattern.test(charStr);
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
    return regExp.test(pastedText);
  }
}
