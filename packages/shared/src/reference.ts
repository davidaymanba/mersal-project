// Crockford-style alphabet without look-alike characters (0/O, 1/I/L).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomChars(length: number, random: () => number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return out;
}

/** Human-friendly shipment reference, e.g. MRS-7K3D-29QX. */
export function generateShipmentReference(
  prefix = 'MRS',
  random: () => number = Math.random,
): string {
  return `${prefix}-${randomChars(4, random)}-${randomChars(4, random)}`;
}

export const SHIPMENT_REFERENCE_PATTERN = /^[A-Z]{3}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;
