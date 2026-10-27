// Catalog helpers without client-only hooks, usable from server and client components.
import type { LocalizedText } from '@mersal/shared';
import {
  BookOpen,
  FileText,
  Gift,
  Package,
  Pill,
  Shirt,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export const gramsToKgText = (grams: number) => (Math.round(grams / 10) / 100).toString();

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'file-text': FileText,
  shirt: Shirt,
  smartphone: Smartphone,
  pill: Pill,
  sparkles: Sparkles,
  'book-open': BookOpen,
  gift: Gift,
  package: Package,
};

export const categoryIcon = (icon: string | null | undefined): LucideIcon =>
  CATEGORY_ICONS[icon ?? ''] ?? Package;

/** Picks a locale's text from a { en, fr, ar } object, falling back to English. */
export const pickLocalized = (names: LocalizedText, locale: string) =>
  names[locale as keyof LocalizedText] || names.en;

/** 2026-11-01 is a Sunday, so weekday n (0 = Sunday) is that date + n days. Format it with { weekday: 'long' }. */
export const weekdayDate = (n: number) => new Date(Date.UTC(2026, 10, 1 + n, 12));
