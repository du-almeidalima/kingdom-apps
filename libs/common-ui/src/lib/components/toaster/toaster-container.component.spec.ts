import { MockBuilder, MockedComponentFixture, MockRender, ngMocks } from 'ng-mocks';
import { ToasterContainerComponent } from './toaster-container.component';
import { ToastConfig } from './toaster.models';
import { IconComponent } from '../icon/icon.component';

describe('ToasterContainerComponent', () => {
  let component: ToasterContainerComponent;
  let fixture: MockedComponentFixture<ToasterContainerComponent>;

  beforeEach(() => {
    return MockBuilder(ToasterContainerComponent).mock(IconComponent);
  });

  beforeEach(() => {
    fixture = MockRender(ToasterContainerComponent);
    component = fixture.point.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty toasts array', () => {
    expect(component.toasts()).toEqual([]);
  });

  describe('push', () => {
    it('should add a toast with default values', () => {
      const config: ToastConfig = { message: 'Test message' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toEqual(
        expect.objectContaining({
          id: 1,
          message: 'Test message',
          type: 'info',
          durationMs: 3000,
        })
      );
    });

    it('should add a toast with custom type', () => {
      const config: ToastConfig = { message: 'Success message', type: 'success' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].type).toBe('success');
    });

    it('should add a toast with custom duration', () => {
      const config: ToastConfig = { message: 'Custom duration', durationMs: 5000 };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].durationMs).toBe(5000);
    });

    it('should add a toast with icon', () => {
      const config: ToastConfig = { message: 'With icon', icon: 'check-mark-circle-lined' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].icon).toBe('check-mark-circle-lined');
      expect(toasts[0].iconColor).toBeDefined();
    });

    it('should generate unique IDs for multiple toasts', () => {
      component.push({ message: 'First toast' });
      component.push({ message: 'Second toast' });

      const toasts = component.toasts();
      expect(toasts).toHaveLength(2);
      expect(toasts[0].id).toBe(1);
      expect(toasts[1].id).toBe(2);
    });

    it('should auto-dismiss toast after specified duration', () => {
      jest.useFakeTimers();
      const config: ToastConfig = { message: 'Auto dismiss', durationMs: 1000 };

      component.push(config);
      expect(component.toasts()).toHaveLength(1);

      jest.advanceTimersByTime(1000);
      expect(component.toasts()).toHaveLength(0);

      jest.useRealTimers();
    });

    it('should not auto-dismiss toast with zero duration', () => {
      jest.useFakeTimers();
      const config: ToastConfig = { message: 'No auto dismiss', durationMs: 0 };

      component.push(config);
      expect(component.toasts()).toHaveLength(1);

      jest.advanceTimersByTime(5000);
      expect(component.toasts()).toHaveLength(1);

      jest.useRealTimers();
    });

    it('should not auto-dismiss toast with negative duration', () => {
      jest.useFakeTimers();
      const config: ToastConfig = { message: 'No auto dismiss', durationMs: -1 };

      component.push(config);
      expect(component.toasts()).toHaveLength(1);

      jest.advanceTimersByTime(5000);
      expect(component.toasts()).toHaveLength(1);

      jest.useRealTimers();
    });
  });

  describe('dismiss', () => {
    it('should remove toast by ID', () => {
      component.push({ message: 'First' });
      component.push({ message: 'Second' });

      const toasts = component.toasts();
      const firstId = toasts[0].id;

      component.dismiss(firstId);

      const remainingToasts = component.toasts();
      expect(remainingToasts).toHaveLength(1);
      expect(remainingToasts[0].message).toBe('Second');
    });

    it('should handle dismissing non-existent toast ID', () => {
      component.push({ message: 'Test' });

      component.dismiss(999);

      expect(component.toasts()).toHaveLength(1);
    });

    it('should remove all toasts when dismissing all IDs', () => {
      component.push({ message: 'First' });
      component.push({ message: 'Second' });

      const toasts = component.toasts();
      component.dismiss(toasts[0].id);
      component.dismiss(toasts[1].id);

      expect(component.toasts()).toHaveLength(0);
    });
  });

  describe('toast icon colors', () => {
    it('should set correct icon color for success toast', () => {
      const config: ToastConfig = { message: 'Success', type: 'success', icon: 'check-mark-circle-lined' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].iconColor).toBe('#15803d'); // green700
    });

    it('should set correct icon color for warning toast', () => {
      const config: ToastConfig = { message: 'Warning', type: 'warning', icon: 'warning-lined' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].iconColor).toBe('#c2410c'); // orange700
    });

    it('should set correct icon color for error toast', () => {
      const config: ToastConfig = { message: 'Error', type: 'error', icon: 'error-8' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].iconColor).toBe('#b91d1d'); // red700
    });

    it('should set correct icon color for info toast', () => {
      const config: ToastConfig = { message: 'Info', type: 'info', icon: 'info-lined' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].iconColor).toBe('#FDFDFD'); // white100
    });

    it('should set default icon color when type is not specified', () => {
      const config: ToastConfig = { message: 'Default', icon: 'info-lined' };

      component.push(config);

      const toasts = component.toasts();
      expect(toasts[0].iconColor).toBe('#FDFDFD'); // white100 (default for info type)
    });
  });

  describe('template rendering', () => {
    it('should render toast messages correctly', () => {
      component.push({ message: 'Test message' });
      fixture.detectChanges();

      const messageElement = ngMocks.find('.toast__message');
      expect(messageElement.nativeElement.textContent.trim()).toBe('Test message');
    });

    test.each<Pick<ToastConfig, 'type' | 'message' | 'icon'>>([
      { type: 'info', message: 'Info message', icon: 'info-lined' },
      { type: 'success', message: 'Success message', icon: 'check-mark-circle-lined' },
      { type: 'warning', message: 'Warning message', icon: 'warning-lined' },
      { type: 'error', message: 'Error message', icon: 'error-8' },
    ])('should apply correct CSS class for $type toast type', ({ type, message, icon }) => {
      component.push({ message, type, icon });
      fixture.detectChanges();

      const toastElement = fixture.nativeElement.querySelector(`.toast--${type}`);
      expect(toastElement).toBeTruthy();
    });

    it('should render icon when provided', () => {
      component.push({ message: 'With icon', icon: 'check-mark-circle-lined' });
      fixture.detectChanges();

      const iconElement = ngMocks.find(IconComponent);
      expect(iconElement).toBeTruthy();
      expect(iconElement.componentInstance.icon).toBe('check-mark-circle-lined');
    });

    it('should not render icon when not provided', () => {
      component.push({ message: 'Without icon' });
      fixture.detectChanges();

      const iconElement = ngMocks.find(IconComponent, undefined);
      expect(iconElement).toBeFalsy();
    });

    it('should set correct icon color for warning toast', () => {
      component.push({ message: 'Warning', type: 'warning', icon: 'warning-lined' });
      fixture.detectChanges();

      const iconElement = ngMocks.find(IconComponent);
      expect(iconElement.componentInstance.fillColor).toBe('#c2410c'); // orange700
    });

    it('should set correct icon color for success toast', () => {
      component.push({ message: 'Success', type: 'success', icon: 'check-mark-circle-lined' });
      fixture.detectChanges();

      const iconElement = ngMocks.find(IconComponent);
      expect(iconElement.componentInstance.fillColor).toBe('#15803d'); // green700
    });

    it('should set correct icon color for error toast', () => {
      component.push({ message: 'Error', type: 'error', icon: 'error-8' });
      fixture.detectChanges();

      const iconElement = ngMocks.find(IconComponent);
      expect(iconElement.componentInstance.fillColor).toBe('#b91d1d'); // red700
    });

    it('should set correct icon color for info toast', () => {
      component.push({ message: 'Info', type: 'info', icon: 'info-lined' });
      fixture.detectChanges();

      const iconElement = ngMocks.find(IconComponent);
      expect(iconElement.componentInstance.fillColor).toBe('#FDFDFD'); // white100
    });
  });

  describe('interaction', () => {
    it('should dismiss toast on click', () => {
      component.push({ message: 'Clickable toast' });
      fixture.detectChanges();

      const toastElement = ngMocks.find('.toast');
      ngMocks.click(toastElement);

      expect(component.toasts()).toHaveLength(0);
    });

    it('should dismiss toast on Enter key', () => {
      component.push({ message: 'Keyboard accessible toast' });
      fixture.detectChanges();

      const toastElement = ngMocks.find('.toast');
      ngMocks.trigger(toastElement, 'keydown.enter');

      expect(component.toasts()).toHaveLength(0);
    });

    it('should dismiss toast on Space key', () => {
      component.push({ message: 'Keyboard accessible toast' });
      fixture.detectChanges();

      const toastElement = ngMocks.find('.toast');
      ngMocks.trigger(toastElement, 'keydown.space');

      expect(component.toasts()).toHaveLength(0);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      component.push({ message: 'Accessible toast' });
      fixture.detectChanges();

      const toasterElement = ngMocks.find('.toaster');
      const toastElement = ngMocks.find('.toast');

      expect(toasterElement.nativeElement.getAttribute('role')).toBe('status');
      expect(toastElement.nativeElement.getAttribute('role')).toBe('button');
      expect(toastElement.nativeElement.getAttribute('aria-label')).toBe('Dismiss notification');
      expect(toastElement.nativeElement.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('multiple toasts', () => {
    it('should render multiple toasts correctly', () => {
      component.push({ message: 'First toast' });
      component.push({ message: 'Second toast' });
      component.push({ message: 'Third toast' });
      fixture.detectChanges();

      const toastElements = ngMocks.findAll('.toast');
      expect(toastElements).toHaveLength(3);

      const messages = toastElements.map((el) => {
        const messageEl = ngMocks.find(el, '.toast__message');
        return messageEl.nativeElement.textContent.trim();
      });
      expect(messages).toEqual(['First toast', 'Second toast', 'Third toast']);
    });

    it('should dismiss specific toast from multiple toasts', () => {
      component.push({ message: 'First toast' });
      component.push({ message: 'Second toast' });
      component.push({ message: 'Third toast' });
      fixture.detectChanges();

      const toastElements = ngMocks.findAll('.toast');
      // Click the middle toast
      ngMocks.click(toastElements[1]);
      fixture.detectChanges();

      const remainingToasts = ngMocks.findAll('.toast');
      expect(remainingToasts).toHaveLength(2);

      const messages = remainingToasts.map((el) => {
        const messageEl = ngMocks.find(el, '.toast__message');
        return messageEl.nativeElement.textContent.trim();
      });
      expect(messages).toEqual(['First toast', 'Third toast']);
    });
  });
});
