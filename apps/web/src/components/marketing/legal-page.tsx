import { FileWarning } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

interface Section {
  id: string;
  title: string;
  body: string;
}

/** Long-form legal document with a table of contents. Paragraphs in `body` are separated by blank lines. */
export async function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: Section[];
}) {
  const t = await getTranslations('legal');

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-14 pb-24 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold text-ink sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{intro}</p>
          <div
            role="note"
            className="mt-6 flex gap-3 rounded-xl border border-warning/30 bg-warning-tint px-4 py-3 text-sm text-ink"
          >
            <FileWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p>{t('draftNotice')}</p>
          </div>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="max-w-3xl space-y-10">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-24"
              >
                <h2 id={`${section.id}-title`} className="text-xl font-semibold text-ink">
                  {index + 1}. {section.title}
                </h2>
                {section.body.split('\n\n').map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="mt-3 leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <nav aria-label={t('contents')} className="order-first lg:order-none">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-sm font-semibold text-ink">{t('contents')}</h2>
              <ol className="mt-3 space-y-2 text-sm">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-muted-foreground hover:text-ink">
                      {index + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
