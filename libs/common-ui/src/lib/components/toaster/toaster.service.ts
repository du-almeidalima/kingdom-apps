import { inject, Injectable } from '@angular/core';

import { ToastConfig } from './toaster.models';
import { ToasterContainerComponent } from './toaster-container.component';
import { PortalService, AttachedComponent } from '../portal/portal.service';

/**
 * Simple service to show toast notifications.
 *
 * It lazily attaches a `ToasterContainerComponent` to the application via
 * the `PortalService` and forwards toast requests to that container.
 */
@Injectable({ providedIn: 'root' })
export class ToasterService {
  /**
   * Service used to attach the toaster container to the app.
   */
  private portal = inject(PortalService);

  /**
   * The attached container component reference. It is created on demand.
   */
  private attached?: AttachedComponent<ToasterContainerComponent>;

  /**
   * Ensure the toaster container is attached.
   *
   * If the container isn't attached yet, this will attach it using the
   * PortalService and store the attached reference.
   */
  private ensure() {
    if (!this.attached) {
      this.attached = this.portal.attachComponent(ToasterContainerComponent);
    }
  }

  /**
   * Show a toast with the given configuration.
   * @param config Configuration for the toast (message, type, icon, duration).
   */
  show(config: ToastConfig) {
    this.ensure();
    this.attached?.ref.instance.push(config);
  }

  /**
   * Show an informational toast.
   * @param message The message text to show.
   * @param durationMs Optional duration in milliseconds.
   */
  info(message: string, durationMs?: number) {
    this.show({ message, type: 'info', durationMs, icon: 'info-lined' });
  }

  /**
   * Show a success toast.
   * @param message The message text to show.
   * @param durationMs Optional duration in milliseconds.
   */
  success(message: string, durationMs?: number) {
    this.show({ message, type: 'success', durationMs, icon: 'check-mark-circle-lined' });
  }

  /**
   * Show a warning toast.
   * @param message The message text to show.
   * @param durationMs Optional duration in milliseconds.
   */
  warning(message: string, durationMs?: number) {
    this.show({ message, type: 'warning', durationMs, icon: 'warning-lined' });
  }

  /**
   * Show an error toast.
   * @param message The message text to show.
   * @param durationMs Optional duration in milliseconds.
   */
  error(message: string, durationMs?: number) {
    this.show({ message, type: 'error', durationMs, icon: 'error-8' });
  }
}
