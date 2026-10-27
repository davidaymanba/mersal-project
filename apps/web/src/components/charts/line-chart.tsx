'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface LineSeries {
  key: string;
  label: string;
  /** Validated categorical slot (see charts/palette.ts). */
  color: string;
}

export interface LinePoint {
  x: string;
  values: Record<string, number>;
}

interface LineChartProps {
  data: LinePoint[];
  series: LineSeries[];
  formatX: (x: string) => string;
  formatValue?: (v: number) => string;
  height?: number;
  /** Accessible summary of what the chart shows. */
  label: string;
}

const MARGIN = { top: 12, right: 16, bottom: 28, left: 36 };

/** Rounds the axis maximum up to a clean value and returns ~4 ticks. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step);
  return ticks;
}

/**
 * Multi-series line chart: 2px lines, ringed end markers, hairline grid, one y-axis,
 * crosshair + tooltip listing every series at the hovered x (also via arrow keys).
 */
export function LineChart({
  data,
  series,
  formatX,
  formatValue = (v) => String(v),
  height = 240,
  label,
}: LineChartProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, entry!.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const x = (i: number) =>
    MARGIN.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => MARGIN.top + innerH - (v / top) * innerH;
  const xTickEvery = Math.max(1, Math.ceil(data.length / 6));

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const index = Math.round(((px - MARGIN.left) / innerW) * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, index)));
  };
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    setActive((current) =>
      Math.min(data.length - 1, Math.max(0, (current ?? data.length - 1) + delta)),
    );
  };

  const point = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? Math.min(x(active) + 12, width - 168) : 0;

  return (
    <div className="flex flex-col gap-3">
      <ul
        className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground"
        aria-label="Legend"
      >
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            {s.label}
          </li>
        ))}
      </ul>
      <div ref={wrapper} className="relative" dir="ltr">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          onPointerMove={onPointer}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(data.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {formatValue(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % xTickEvery === 0 || i === data.length - 1 ? (
              <text
                key={d.x}
                x={x(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {formatX(d.x)}
              </text>
            ) : null,
          )}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={MARGIN.top}
              y2={MARGIN.top + innerH}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
            />
          )}
          {series.map((s, index) => (
            <path
              key={s.key}
              d={data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.values[s.key] ?? 0)}`).join('')}
              pathLength={1}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="animate-draw [stroke-dasharray:1]"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
          {series.map((s) => {
            const i = active ?? data.length - 1;
            const value = data[i]?.values[s.key] ?? 0;
            return (
              <circle
                key={s.key}
                cx={x(i)}
                cy={y(value)}
                r={4}
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            );
          })}
        </svg>
        {point && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-40 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: tooltipLeft }}
            role="status"
          >
            <p className="mb-1.5 text-muted-foreground">{formatX(point.x)}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-2">
                <span
                  className="h-0.5 w-3 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                <span className="font-semibold text-ink tabular-nums">
                  {formatValue(point.values[s.key] ?? 0)}
                </span>
                <span className="text-muted-foreground">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
