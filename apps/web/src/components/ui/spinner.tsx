import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-4 animate-spin', className)} aria-hidden="true" />;
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      <Spinner className="size-6" />
    </div>
  );
}
