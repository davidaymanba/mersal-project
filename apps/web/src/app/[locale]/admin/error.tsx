'use client';

import { ErrorView } from '@/components/feedback/error-view';

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView {...props} home="/admin" />;
}
