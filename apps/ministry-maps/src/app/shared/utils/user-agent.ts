export enum BrowserEnum {
  CHROME,
  FIREFOX,
  SAMSUNG,
  SAFARI,
  UNKNOWN,
}

export const isMobileDevice = () => {
  // https://dev.to/timhuang/a-simple-way-to-detect-if-browser-is-on-a-mobile-device-with-javascript-44j3
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getAgentBrowser = (): BrowserEnum => {
  const ua = navigator.userAgent;

  switch (true) {
    case !!ua.match(/iPad|iPhone|iPod/i) && !!ua.match(/WebKit/i) && !ua.match(/CriOS/i):
      return BrowserEnum.SAFARI;
    case !!ua.match(/Samsung/i):
      return BrowserEnum.SAMSUNG;
    case !!ua.match(/chrome|chromium|crios/i):
      return BrowserEnum.CHROME;
    case !!ua.match(/firefox|fxios/i):
      return BrowserEnum.FIREFOX;
    default:
      return BrowserEnum.UNKNOWN;
  }
};
