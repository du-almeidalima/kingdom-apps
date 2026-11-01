import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

@Component({
  imports: [ButtonComponent],
  template: '<button lib-button>OK</button><button lib-button [btnType]="type()">Excluir</button>',
})
class HostComponent {
  type = signal<'secondary' | 'primary' | 'danger'>('secondary');
}

describe('ButtonComponent', () => {
  it('should create', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button:first-child');
    expect(button).toBeTruthy();
    expect(button.className).toContain('button--secondary');
  });

  it('applies and updates the danger variant', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button:last-child');
    expect(button.className).toContain('button--secondary');

    fixture.componentInstance.type.set('danger');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button.className).toContain('button--danger');
    expect(button.className).not.toContain('button--secondary');
  });
});
