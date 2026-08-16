import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoteComponent } from './note.component';
import { By } from '@angular/platform-browser';

describe('NoteComponent', () => {
  let fixture: ComponentFixture<NoteComponent>;
  let component: NoteComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();

    fixture = TestBed.createComponent(NoteComponent);
    fixture.componentRef.setInput('type', 'info');
    fixture.componentRef.setInput('message', 'Initial test message');

    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display the message', () => {
    const testMessage = 'Test notification message';
    fixture.componentRef.setInput('type', 'info');
    fixture.componentRef.setInput('message', testMessage);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(testMessage);
  });

  it('should apply info classes when type is info', () => {
    const testMessage = 'Info message';
    fixture.componentRef.setInput('type', 'info');
    fixture.componentRef.setInput('message', testMessage);

    fixture.detectChanges();
    const container = fixture.debugElement.query(By.css('div')).nativeElement;
    expect(container.classList.contains('note--info')).toBeTruthy();
  });

  it('should apply success classes when type is success', () => {
    const testMessage = 'Success message';
    fixture.componentRef.setInput('type', 'success');
    fixture.componentRef.setInput('message', testMessage);
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('div')).nativeElement;
    expect(container.classList.contains('note--success')).toBeTruthy();
  });

  it('should apply warning classes when type is warning', () => {
    const testMessage = 'Warning message';
    fixture.componentRef.setInput('type', 'warning');
    fixture.componentRef.setInput('message', testMessage);
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('div')).nativeElement;
    expect(container.classList.contains('note--warning')).toBeTruthy();
  });

  it('should apply error classes when type is error', () => {
    const testMessage = 'Error message';
    fixture.componentRef.setInput('type', 'error');
    fixture.componentRef.setInput('message', testMessage);
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('div')).nativeElement;
    expect(container.classList.contains('note--error')).toBeTruthy();
  });

  it.each([
    ['info', 'info-lined'],
    ['success', 'check-mark-circle-thin'],
    ['warning', 'warning-lined'],
    ['error', 'error-8'],
  ])('should use the correct icon when type is %s', (type, expectedIcon) => {
    const testMessage = `${type} message`;
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('message', testMessage);
    fixture.detectChanges();

    expect(fixture.componentInstance.typeIcon()).toBe(expectedIcon);
  });
});
