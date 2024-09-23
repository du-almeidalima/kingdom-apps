/** Creates a link that will open WhatsApp */
export const createSendWhatsAppLink = (text: string) => {
  return `whatsapp://send?text=` + text;
}
