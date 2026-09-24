import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FloatingActionButtonComponent } from './floating-action-button.component';

@Component({
  imports: [FloatingActionButtonComponent],
  template: '<button lib-floating-action-button [badge]="badge">OK</button>',
})
class HostComponent {
  badge?: number;
}

describe('FloatingActionBtnComponent', () => {
  const render = (badge?: number) => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.badge = badge;
    fixture.detectChanges();
    return fixture;
  };

  const badgeEl = (fixture: ReturnType<typeof render>) =>
    fixture.nativeElement.querySelector('[data-testid="fab-badge"]');

  it('should create', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.className).toContain('floating-action-btn');
  });

  it('renders the badge with the given positive count', () => {
    const fixture = render(3);

    expect(badgeEl(fixture)).toBeTruthy();
    expect(badgeEl(fixture).textContent).toContain('3');
  });

  it('hides the badge when the count is undefined', () => {
    const fixture = render(undefined);

    expect(badgeEl(fixture)).toBeNull();
  });

  it('hides the badge when the count is zero', () => {
    const fixture = render(0);

    expect(badgeEl(fixture)).toBeNull();
  });
});
