import type { ReactNode } from 'react';
import { RouteArc } from './route-arc';

/** Dark closing call to action used at the bottom of the public pages. */
export function CtaBand({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div
        data-reveal
        className="relative isolate flex flex-col items-start gap-6 overflow-hidden rounded-3xl bg-deep px-8 py-14 text-white shadow-lg md:flex-row md:items-center md:px-12"
      >
        <div
          className="absolute -end-24 -top-40 -z-10 size-[28rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-primary)_70%,transparent),transparent)] opacity-70"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-48 -start-20 -z-10 size-[24rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-accent)_35%,transparent),transparent)] opacity-60"
          aria-hidden="true"
        />
        <RouteArc
          id="cta-arc"
          tone="dark"
          trigger="reveal"
          delay={0.3}
          className="absolute -end-10 bottom-0 -z-10 w-[36rem] opacity-70 md:w-[44rem]"
        />
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold sm:text-[2rem] sm:leading-tight">{title}</h2>
          <p className="mt-3 leading-relaxed text-white/75">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3 md:ms-auto">{children}</div>
      </div>
    </section>
  );
}
