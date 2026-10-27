import type { ReactNode } from 'react';

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
      <div className="flex flex-col items-start gap-6 rounded-3xl bg-ink px-8 py-12 text-white md:flex-row md:items-center md:px-12">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-3 leading-relaxed text-white/75">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3 md:ms-auto">{children}</div>
      </div>
    </section>
  );
}
