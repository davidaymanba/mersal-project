'use client';

import type { QuoteLine } from '@mersal/shared';
import { useTranslations } from 'next-intl';
import { gramsToKgText, useLocalized, useMoney } from '@/lib/catalog';

interface QuoteLinesProps {
  lines: QuoteLine[];
  currency: string;
  chargeableGrams: number;
  /** Option names for the corridor, to label option lines. */
  optionNames?: Map<string, { en: string; fr: string; ar: string }>;
  /** Hide the rounding line (shown to admins only). */
  showRounding?: boolean;
}

export function QuoteLines({
  lines,
  currency,
  chargeableGrams,
  optionNames,
  showRounding = false,
}: QuoteLinesProps) {
  const t = useTranslations('pricing.result.lines');
  const money = useMoney();
  const localized = useLocalized();

  // Customers see rounding folded into the line before it, so every displayed line is a real component.
  const visible = showRounding ? lines : foldRounding(lines);

  return (
    <dl className="flex flex-col gap-2 text-sm">
      {visible.map((line, index) => (
        <div key={`${line.code}-${line.ref ?? index}`} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {line.code === 'option'
              ? localized(optionNames?.get(line.ref ?? '')) || line.ref
              : line.code === 'base'
                ? t('base', { kg: gramsToKgText(chargeableGrams) })
                : t(line.code)}
          </dt>
          <dd className="text-ink tabular-nums">
            {line.code !== 'base' && line.amount > 0 ? '+' : ''}
            {money(line.amount, currency)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function foldRounding(lines: QuoteLine[]): QuoteLine[] {
  const result: QuoteLine[] = [];
  for (const line of lines) {
    const previous = result[result.length - 1];
    if (line.code === 'rounding' && previous) {
      result[result.length - 1] = { ...previous, amount: previous.amount + line.amount };
    } else {
      result.push({ ...line });
    }
  }
  return result;
}
