/** Builds a given object with a base object and overrides some of its properties */
export const mockBuilderFn = <T>(base: T, override: Partial<T>): T => {
  return {
    ...base,
    ...override,
  };
};

/**
 * Overrides `navigator.userAgent` for the current test (jsdom).
 * Returns a restore function — call it in `afterEach`.
 */
export const setUserAgent = (ua: string): (() => void) => {
  const navigatorObject = window.navigator as unknown as Record<string, unknown>;
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigatorObject, 'userAgent');

  Object.defineProperty(navigatorObject, 'userAgent', {
    value: ua,
    configurable: true,
    writable: true,
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(navigatorObject, 'userAgent', originalDescriptor);
    } else {
      delete navigatorObject['userAgent'];
    }
  };
};

/** Spies on `window.open` avoiding jsdom "Not implemented: navigation" errors. */
export const spyWindowOpen = () => jest.spyOn(window, 'open').mockReturnValue(null);
