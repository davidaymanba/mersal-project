import { cookies } from 'next/headers';
import { Link } from '@/i18n/navigation';
import { Logo } from './brand/logo';
import { SiteHeaderFrame } from './site-header-frame';
import { SiteNav } from './site-nav';

export async function SiteHeader() {
  // The refresh cookie only means a session may exist; the app area validates it.
  const signedIn = (await cookies()).has('mersal_rt');

  return (
    <SiteHeaderFrame>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" aria-label="Mersal" className="group/logo">
          <Logo />
        </Link>
        <SiteNav signedIn={signedIn} />
      </div>
    </SiteHeaderFrame>
  );
}
