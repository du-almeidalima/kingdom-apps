import { FeatureRoutesEnum } from '../../app-routes';
import { isMobileDevice } from './user-agent';

/** Creates a link that will open WhatsApp */
export const createSendWhatsAppLink = (text: string) => {
  return `whatsapp://send?text=${encodeURIComponent(text)}`;
};

/** Opens the WhatsApp share flow for a designation. */
export const shareDesignationLink = (designationId: string, browserWindow: Pick<Window, 'location' | 'open'> = window) => {
  const builtUrl = createSendWhatsAppLink(`${browserWindow.location.origin}/${FeatureRoutesEnum.WORK}/${designationId}`);
  if (isMobileDevice()) {
    browserWindow.location.href = builtUrl;
  } else {
    browserWindow.open(builtUrl);
  }
};
