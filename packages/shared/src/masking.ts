const MASK = '•••';

// Phone numbers: 8+ digits, optionally with +, spaces, dots, dashes or brackets between them.
const PHONE = /(?:\+|00)?\d(?:[\s.\-()]*\d){7,}/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Direct-contact links people use to move a deal off-platform.
const CONTACT_LINK =
  /\b(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|t\.me|m\.me|instagram\.com|facebook\.com|snapchat\.com)\/\S*/gi;

/**
 * Hides phone numbers, emails and messaging links in chat messages so senders and
 * travellers keep the arrangement (and its protections) on the platform.
 */
export function maskContactDetails(text: string): { text: string; masked: boolean } {
  const result = text.replace(CONTACT_LINK, MASK).replace(EMAIL, MASK).replace(PHONE, MASK);
  return { text: result, masked: result !== text };
}
