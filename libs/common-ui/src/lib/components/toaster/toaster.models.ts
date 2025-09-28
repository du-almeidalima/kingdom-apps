import { Icons } from '../icon/icon-type';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastConfig {
  /** Message text to display inside the toast */
  message: string;
  /** Visual style of the toast; defaults to 'info' */
  type?: ToastType;
  /** Optional icon to display in the toast */
  icon?: Icons;
  /**
   * Auto-dismiss duration in milliseconds. Use 0 or a negative number to keep it until manually dismissed.
   * Defaults to DEFAULT_TOAST_DURATION_MS.
   */
  durationMs?: number;
}

export const DEFAULT_TOAST_DURATION_MS = 5000;
