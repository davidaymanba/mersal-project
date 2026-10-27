/**
 * Brand definitions. Every visual decision lives here and in tokens.css so the
 * platform can be re-skinned for a partner (white-label) without touching UI code.
 */

export type BrandId = 'mersal' | 'wassla';

export type LocalizedText = { en: string; fr: string; ar: string };

export interface BrandColor {
  token: string;
  name: string;
  hex: string;
  usage: string;
}

export interface Brand {
  id: BrandId;
  name: string;
  nameAr: string;
  tagline: LocalizedText;
  referencePrefix: string;
  colors: BrandColor[];
}

export const mersal: Brand = {
  id: 'mersal',
  name: 'Mersal',
  nameAr: 'مرسال',
  tagline: {
    en: 'Your parcel travels with someone already going.',
    fr: "Votre colis voyage avec quelqu'un qui part déjà.",
    ar: 'طردك يسافر مع من هو مسافر أصلاً.',
  },
  referencePrefix: 'MRS',
  colors: [
    {
      token: '--brand-ink',
      name: 'Deep Sea',
      hex: '#0B2E33',
      usage: 'Headings, body text, dark surfaces',
    },
    {
      token: '--brand-primary',
      name: 'Mersal Teal',
      hex: '#0F766E',
      usage: 'Primary actions, links, focus',
    },
    {
      token: '--brand-tint',
      name: 'Teal Tint',
      hex: '#E6F4F2',
      usage: 'Subtle fills, selected states, badges',
    },
    {
      token: '--brand-accent',
      name: 'Terracotta',
      hex: '#E2643B',
      usage: 'Icons and illustration accents only',
    },
    {
      token: '--brand-accent-strong',
      name: 'Terracotta Deep',
      hex: '#B9471F',
      usage: 'Accent text on light backgrounds',
    },
    { token: '--brand-sand', name: 'Sand', hex: '#F7F2EA', usage: 'Warm section backgrounds' },
    { token: '--surface', name: 'White', hex: '#FFFFFF', usage: 'Cards and page surface' },
  ],
};

/**
 * Partner theme used to demo white-labelling. Colours come from the partner's
 * public brief; the partner's logo is never reproduced — only the name as text.
 */
export const wassla: Brand = {
  id: 'wassla',
  name: "WASS'LA",
  nameAr: 'واصلة',
  tagline: {
    en: 'Trusted delivery between France and Algeria.',
    fr: "Livraison de confiance entre la France et l'Algérie.",
    ar: 'توصيل موثوق بين فرنسا والجزائر.',
  },
  referencePrefix: 'WSL',
  colors: [
    {
      token: '--brand-ink',
      name: 'Midnight Navy',
      hex: '#071B33',
      usage: 'Headings and body text',
    },
    { token: '--brand-primary', name: 'Royal Blue', hex: '#092B65', usage: 'Primary actions' },
    { token: '--brand-tint', name: 'Blue Tint', hex: '#EAF0FA', usage: 'Subtle fills' },
    {
      token: '--brand-accent',
      name: 'Signature Yellow',
      hex: '#FFD200',
      usage: 'Restrained accents',
    },
    {
      token: '--brand-accent-strong',
      name: 'Deep Gold',
      hex: '#7A5F00',
      usage: 'Accent text on light backgrounds',
    },
    { token: '--brand-sand', name: 'Mist', hex: '#F5F7FB', usage: 'Section backgrounds' },
    { token: '--surface', name: 'White', hex: '#FFFFFF', usage: 'Cards and page surface' },
  ],
};

export const brands: Record<BrandId, Brand> = { mersal, wassla };

export const defaultBrand: BrandId = 'mersal';

export const semanticColors: BrandColor[] = [
  { token: '--success', name: 'Success', hex: '#15803D', usage: 'Delivered, paid, approved' },
  {
    token: '--warning',
    name: 'Warning',
    hex: '#B45309',
    usage: 'Awaiting action, expiring offers',
  },
  { token: '--danger', name: 'Danger', hex: '#B91C1C', usage: 'Errors, disputes, rejections' },
  { token: '--info', name: 'Info', hex: '#1D4ED8', usage: 'Neutral system information' },
];

export const typography = {
  display: { family: 'Readex Pro', usage: 'Headings in Latin and Arabic scripts' },
  body: { family: 'IBM Plex Sans', usage: 'Body text and UI (Latin)' },
  bodyArabic: { family: 'IBM Plex Sans Arabic', usage: 'Body text and UI (Arabic)' },
} as const;

export function isBrandId(value: unknown): value is BrandId {
  return value === 'mersal' || value === 'wassla';
}
