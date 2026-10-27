import type { LocalizedText, PricingRules } from '@mersal/shared';

/** Reference data the platform needs to run: corridors, cities, catalogue and default rules. */

export const corridors = [
  { code: 'FR-DZ', originCountry: 'FR', destinationCountry: 'DZ' },
  { code: 'DZ-FR', originCountry: 'DZ', destinationCountry: 'FR' },
  { code: 'FR-MA', originCountry: 'FR', destinationCountry: 'MA' },
  { code: 'MA-FR', originCountry: 'MA', destinationCountry: 'FR' },
  { code: 'FR-TN', originCountry: 'FR', destinationCountry: 'TN' },
  { code: 'TN-FR', originCountry: 'TN', destinationCountry: 'FR' },
] as const;

export const cities: { countryCode: string; slug: string; names: LocalizedText }[] = [
  { countryCode: 'FR', slug: 'fr-paris', names: { en: 'Paris', fr: 'Paris', ar: 'باريس' } },
  { countryCode: 'FR', slug: 'fr-lyon', names: { en: 'Lyon', fr: 'Lyon', ar: 'ليون' } },
  {
    countryCode: 'FR',
    slug: 'fr-marseille',
    names: { en: 'Marseille', fr: 'Marseille', ar: 'مرسيليا' },
  },
  { countryCode: 'FR', slug: 'fr-lille', names: { en: 'Lille', fr: 'Lille', ar: 'ليل' } },
  {
    countryCode: 'FR',
    slug: 'fr-toulouse',
    names: { en: 'Toulouse', fr: 'Toulouse', ar: 'تولوز' },
  },
  { countryCode: 'FR', slug: 'fr-nice', names: { en: 'Nice', fr: 'Nice', ar: 'نيس' } },
  {
    countryCode: 'FR',
    slug: 'fr-bordeaux',
    names: { en: 'Bordeaux', fr: 'Bordeaux', ar: 'بوردو' },
  },
  {
    countryCode: 'DZ',
    slug: 'dz-algiers',
    names: { en: 'Algiers', fr: 'Alger', ar: 'الجزائر العاصمة' },
  },
  { countryCode: 'DZ', slug: 'dz-oran', names: { en: 'Oran', fr: 'Oran', ar: 'وهران' } },
  {
    countryCode: 'DZ',
    slug: 'dz-constantine',
    names: { en: 'Constantine', fr: 'Constantine', ar: 'قسنطينة' },
  },
  { countryCode: 'DZ', slug: 'dz-annaba', names: { en: 'Annaba', fr: 'Annaba', ar: 'عنابة' } },
  {
    countryCode: 'DZ',
    slug: 'dz-tizi-ouzou',
    names: { en: 'Tizi Ouzou', fr: 'Tizi Ouzou', ar: 'تيزي وزو' },
  },
  { countryCode: 'DZ', slug: 'dz-setif', names: { en: 'Sétif', fr: 'Sétif', ar: 'سطيف' } },
  { countryCode: 'DZ', slug: 'dz-bejaia', names: { en: 'Béjaïa', fr: 'Béjaïa', ar: 'بجاية' } },
  {
    countryCode: 'MA',
    slug: 'ma-casablanca',
    names: { en: 'Casablanca', fr: 'Casablanca', ar: 'الدار البيضاء' },
  },
  { countryCode: 'MA', slug: 'ma-rabat', names: { en: 'Rabat', fr: 'Rabat', ar: 'الرباط' } },
  {
    countryCode: 'MA',
    slug: 'ma-marrakech',
    names: { en: 'Marrakech', fr: 'Marrakech', ar: 'مراكش' },
  },
  { countryCode: 'MA', slug: 'ma-tangier', names: { en: 'Tangier', fr: 'Tanger', ar: 'طنجة' } },
  { countryCode: 'MA', slug: 'ma-fes', names: { en: 'Fez', fr: 'Fès', ar: 'فاس' } },
  { countryCode: 'TN', slug: 'tn-tunis', names: { en: 'Tunis', fr: 'Tunis', ar: 'تونس' } },
  { countryCode: 'TN', slug: 'tn-sfax', names: { en: 'Sfax', fr: 'Sfax', ar: 'صفاقس' } },
  { countryCode: 'TN', slug: 'tn-sousse', names: { en: 'Sousse', fr: 'Sousse', ar: 'سوسة' } },
];

export const categories: {
  code: string;
  names: LocalizedText;
  icon: string;
  requiresPhotos?: boolean;
  maxWeightGrams?: number;
}[] = [
  {
    code: 'DOCUMENTS',
    icon: 'file-text',
    maxWeightGrams: 2000,
    names: { en: 'Documents', fr: 'Documents', ar: 'مستندات' },
  },
  {
    code: 'CLOTHING',
    icon: 'shirt',
    names: { en: 'Clothing & textiles', fr: 'Vêtements et textiles', ar: 'ملابس ومنسوجات' },
  },
  {
    code: 'SMALL_ELECTRONICS',
    icon: 'smartphone',
    requiresPhotos: true,
    maxWeightGrams: 5000,
    names: { en: 'Small electronics', fr: 'Petit électronique', ar: 'إلكترونيات صغيرة' },
  },
  {
    code: 'MEDICINE',
    icon: 'pill',
    requiresPhotos: true,
    maxWeightGrams: 3000,
    names: {
      en: 'Medicine (with prescription)',
      fr: 'Médicaments (avec ordonnance)',
      ar: 'أدوية (مع وصفة طبية)',
    },
  },
  {
    code: 'COSMETICS',
    icon: 'sparkles',
    names: { en: 'Cosmetics & care', fr: 'Cosmétiques et soins', ar: 'مستحضرات تجميل وعناية' },
  },
  { code: 'BOOKS', icon: 'book-open', names: { en: 'Books', fr: 'Livres', ar: 'كتب' } },
  {
    code: 'GIFTS',
    icon: 'gift',
    names: { en: 'Gifts & accessories', fr: 'Cadeaux et accessoires', ar: 'هدايا وإكسسوارات' },
  },
  {
    code: 'SEALED_FOOD',
    icon: 'package',
    requiresPhotos: true,
    names: {
      en: 'Sealed food (non-perishable)',
      fr: 'Alimentaire scellé (non périssable)',
      ar: 'أغذية مغلقة (غير قابلة للتلف)',
    },
  },
];

export const restrictedItems: { level: 'PROHIBITED' | 'RESTRICTED'; names: LocalizedText }[] = [
  {
    level: 'PROHIBITED',
    names: {
      en: 'Weapons, ammunition and replicas',
      fr: 'Armes, munitions et répliques',
      ar: 'الأسلحة والذخائر والمجسمات',
    },
  },
  {
    level: 'PROHIBITED',
    names: {
      en: 'Drugs and narcotics',
      fr: 'Drogues et stupéfiants',
      ar: 'المخدرات والمواد المخدرة',
    },
  },
  {
    level: 'PROHIBITED',
    names: {
      en: 'Explosives, flammables, gas and aerosols',
      fr: 'Explosifs, inflammables, gaz et aérosols',
      ar: 'المتفجرات والمواد القابلة للاشتعال والغاز والبخاخات',
    },
  },
  {
    level: 'PROHIBITED',
    names: {
      en: 'Cash, bank cards and precious metals',
      fr: 'Espèces, cartes bancaires et métaux précieux',
      ar: 'النقود والبطاقات البنكية والمعادن الثمينة',
    },
  },
  {
    level: 'PROHIBITED',
    names: { en: 'Counterfeit goods', fr: 'Contrefaçons', ar: 'البضائع المقلدة' },
  },
  {
    level: 'PROHIBITED',
    names: {
      en: 'Live animals and plants',
      fr: 'Animaux et plantes vivants',
      ar: 'الحيوانات والنباتات الحية',
    },
  },
  {
    level: 'PROHIBITED',
    names: { en: 'Perishable food', fr: 'Denrées périssables', ar: 'الأغذية القابلة للتلف' },
  },
  {
    level: 'RESTRICTED',
    names: {
      en: 'Loose lithium batteries and power banks',
      fr: 'Batteries lithium seules et batteries externes',
      ar: 'بطاريات الليثيوم المنفصلة وبطاريات الشحن المتنقلة',
    },
  },
  {
    level: 'RESTRICTED',
    names: {
      en: 'Medicine without a prescription',
      fr: 'Médicaments sans ordonnance',
      ar: 'الأدوية بدون وصفة طبية',
    },
  },
  {
    level: 'RESTRICTED',
    names: {
      en: 'Alcohol and tobacco (customs limits apply)',
      fr: 'Alcool et tabac (limites douanières)',
      ar: 'الكحول والتبغ (تطبق الحدود الجمركية)',
    },
  },
];

/** Starting tariff. Values are illustrative and fully editable from the admin dashboard. */
export function defaultPricingRules(scale = 1): PricingRules {
  const price = (euros: number) => Math.round(euros * scale * 100);
  return {
    currency: 'EUR',
    volumetricDivisor: 5000,
    maxWeightGrams: 23000,
    brackets: [
      { upToGrams: 500, price: price(12) },
      { upToGrams: 1000, price: price(16) },
      { upToGrams: 3000, price: price(24) },
      { upToGrams: 5000, price: price(32) },
      { upToGrams: 10000, price: price(48) },
    ],
    extraPerKg: price(4.5),
    categoryMultipliers: {
      DOCUMENTS: 0.85,
      SMALL_ELECTRONICS: 1.25,
      MEDICINE: 1.15,
      SEALED_FOOD: 1.1,
    },
    declaredValue: { freeUpTo: 10000, feeBps: 150 },
    urgencyMultipliers: { STANDARD: 1, EXPRESS: 1.35 },
    options: [
      {
        code: 'EXTRA_COVER',
        price: price(6),
        names: { en: 'Extra cover', fr: 'Couverture renforcée', ar: 'تغطية إضافية' },
      },
      {
        code: 'PHOTO_PROOF',
        price: price(1.5),
        names: {
          en: 'Photo proof at each step',
          fr: 'Preuve photo à chaque étape',
          ar: 'إثبات بالصور في كل مرحلة',
        },
      },
      {
        code: 'FRAGILE',
        price: price(3),
        names: {
          en: 'Fragile handling',
          fr: 'Manipulation fragile',
          ar: 'تعامل خاص مع القابل للكسر',
        },
      },
    ],
    minimumPrice: price(12),
    commissionBps: 2000,
    roundTo: 50,
  };
}

export const corridorPriceScale: Record<string, number> = {
  'FR-DZ': 1,
  'DZ-FR': 1,
  'FR-MA': 0.95,
  'MA-FR': 0.95,
  'FR-TN': 0.95,
  'TN-FR': 0.95,
};

export const defaultMatchingWeights = {
  reliability: 0.35,
  dateProximity: 0.25,
  capacityFit: 0.15,
  rating: 0.15,
  responseRate: 0.1,
};

export const defaultSettings: Record<string, unknown> = {
  'wallet.holdHours': 48,
  'wallet.demoHoldMinutes': 2,
  'payouts.weekday': 1,
  'matching.demoOfferTtlMinutes': 3,
  'quotes.ttlMinutes': 30,
  'disputes.windowHours': 48,
};
