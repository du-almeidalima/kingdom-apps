import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FloatingActionButtonComponent } from './floating-action-button.component';

@Component({
  imports: [FloatingActionButtonComponent],
  template: '<button lib-floating-action-button>OK</button>',
})
class HostComponent {}

describe('FloatingActionBtnComponent', () => {
  it('should create', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.className).toContain('floating-action-btn');
  });
});
