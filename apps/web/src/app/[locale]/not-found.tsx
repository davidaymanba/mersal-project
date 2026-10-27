import { SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatusView } from '@/components/feedback/status-view';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('errorPage');

  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[60dvh]">
        <StatusView icon={SearchX} title={t('notFoundTitle')} body={t('notFoundBody')}>
          <Button asChild>
            <Link href="/">{t('home')}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/help">{t('help')}</Link>
          </Button>
        </StatusView>
      </main>
      <SiteFooter />
    </>
  );
}
