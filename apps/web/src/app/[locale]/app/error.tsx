'use client';

import { ErrorView } from '@/components/feedback/error-view';

export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} home="/app" />;
}
