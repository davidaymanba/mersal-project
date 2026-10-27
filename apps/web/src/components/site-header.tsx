import { cookies } from 'next/headers';
import { Link } from '@/i18n/navigation';
import { Logo } from './brand/logo';
import { SiteNav } from './site-nav';

export async function SiteHeader() {
  // The refresh cookie only means a session may exist; the app area validates it.
  const signedIn = (await cookies()).has('mersal_rt');

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" aria-label="Mersal">
          <Logo />
        </Link>
        <SiteNav signedIn={signedIn} />
      </div>
    </header>
  );
}
