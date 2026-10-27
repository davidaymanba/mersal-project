'use client';

/**
 * Horizontal bars for magnitude by category: one hue, ≤ 20px thick, 4px rounded data-end,
 * square at the baseline, value labelled at the tip in a text token (never the bar colour).
 */
export function BarList({
  items,
  formatValue = (v) => String(v),
  color = 'var(--brand-primary)',
}: {
  items: { key: string; label: string; value: number }[];
  formatValue?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, index) => (
        <li
          key={item.key}
          className="grid grid-cols-[minmax(7rem,10rem)_1fr] items-center gap-3 text-sm"
        >
          <span className="truncate text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <span
            className="flex items-center gap-2"
            title={`${item.label}: ${formatValue(item.value)}`}
          >
            <span
              className="h-5 origin-left animate-grow-x rounded-e-[4px] transition-[width] duration-500 rtl:origin-right"
              style={{
                width: `${Math.max(2, (item.value / max) * 85)}%`,
                background: color,
                animationDelay: `${index * 50}ms`,
              }}
              aria-hidden="true"
            />
            <span className="font-medium text-ink">{formatValue(item.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
