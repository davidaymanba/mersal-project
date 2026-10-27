'use client';

import { ErrorView } from '@/components/feedback/error-view';

export default function LocaleError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="min-h-dvh">
      <ErrorView {...props} />
    </main>
  );
}
