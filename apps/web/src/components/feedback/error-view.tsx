'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { StatusView } from './status-view';

/** Body of every error.tsx boundary: lets the user retry the segment or go somewhere safe. */
export function ErrorView({
  error,
  reset,
  home = '/',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  home?: string;
}) {
  const t = useTranslations('errorPage');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusView icon={TriangleAlert} title={t('errorTitle')} body={t('errorBody')}>
      <Button onClick={reset}>
        <RefreshCw aria-hidden="true" />
        {t('retry')}
      </Button>
      <Button variant="secondary" asChild>
        <Link href={home}>{t('home')}</Link>
      </Button>
      {error.digest && (
        <p className="w-full font-mono text-xs text-muted-foreground" dir="ltr">
          {t('reference', { digest: error.digest })}
        </p>
      )}
    </StatusView>
  );
}
