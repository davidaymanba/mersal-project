/**
 * Soft brand glow and dotted grid behind the top of a public page. It is anchored to the
 * page itself, so render it outside any positioned container; it runs under the header.
 */
export function HeroGlow({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden ${tall ? 'h-[52rem]' : 'h-[34rem]'}`}
      aria-hidden="true"
    >
      <div className="absolute -end-40 -top-56 size-[46rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-primary)_16%,transparent),transparent)]" />
      <div className="absolute -start-56 top-24 size-[40rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-sand)_95%,transparent),transparent)]" />
      <div className="bg-dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_60%_30%,black,transparent)] opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
