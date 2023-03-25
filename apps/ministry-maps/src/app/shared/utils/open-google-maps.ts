import { BrowserEnum, getAgentBrowser } from './user-agent';
import { Territory } from '../../../models/territory';

const extractLinkFromText = (link: string): string => {
  const hyperLinkRegex =
    /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/gim;

  try {
    const matches = link?.match(hyperLinkRegex);

    return matches?.pop() ?? link;
  } catch (e) {
    return link;
  }
};

/**
 * This function is used to open Google Maps, it will try to open the maps app depending on the browser
 * the user is using.
 */
const openGoogleMapsHandler = (mapsLink: string, territory: Territory) => {
  const agentBrowser = getAgentBrowser();
  const sanitizedLink = extractLinkFromText(mapsLink);

  if (agentBrowser === BrowserEnum.CHROME) {
    window.open(sanitizedLink, '_self');
  } else if (agentBrowser === BrowserEnum.SAMSUNG) {
    const mapAddress = `${territory.address}, ${territory.city}`;
    const mapsUrl = new URL('https://www.google.com/maps/search/?api=1');
    mapsUrl.searchParams.set('query', mapAddress);
    const mapsAndroidPackage = 'com.google.android.apps.maps';

    const mapsHostAndPathname = mapsUrl.host + mapsUrl.pathname + mapsUrl.search;

    window.open(
      `intent://${mapsHostAndPathname}#Intent;scheme=http;package=${mapsAndroidPackage};` +
        `S.browser_fallback_url=${mapsLink}%3Fentry%3Ds&sa%3DX;` +
        `S.intent_description=${territory.address};end`
    );
  } else if (BrowserEnum.FIREFOX || BrowserEnum.SAFARI || BrowserEnum.UNKNOWN) {
    window.open(sanitizedLink, '_blank');
  }
};

export default openGoogleMapsHandler;
