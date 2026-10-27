'use client';

import type { MeResponse } from '@mersal/shared';
import { LogOut, Settings, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useLogout } from '@/lib/session';
import { useClickOutside } from '@/lib/use-click-outside';

export function Avatar({
  firstName,
  lastName,
  className = 'size-9',
}: {
  firstName: string;
  lastName: string;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tint to-[color-mix(in_oklab,var(--brand-primary)_22%,var(--surface))] font-display text-sm font-semibold text-primary ring-2 ring-surface ${className}`}
    >
      {(firstName[0] ?? '').toUpperCase()}
      {(lastName[0] ?? '').toUpperCase()}
    </span>
  );
}

export function UserMenu({ me }: { me: MeResponse }) {
  const t = useTranslations();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-muted aria-expanded:bg-muted sm:pe-3"
      >
        <Avatar firstName={me.firstName} lastName={me.lastName} />
        <span className="hidden text-sm font-medium text-ink sm:inline">{me.firstName}</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-60 origin-top-right animate-pop-in overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg rtl:origin-top-left">
          <div className="border-b border-border px-4 py-3">
            <p className="font-medium text-ink">
              {me.firstName} {me.lastName}
            </p>
            <p className="truncate text-sm text-muted-foreground" dir="ltr">
              {me.email}
            </p>
          </div>
          <Link
            href="/app/settings"
            onClick={close}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-muted"
          >
            <Settings className="size-4" aria-hidden="true" />
            {t('app.nav.settings')}
          </Link>
          {me.role === 'ADMIN' && (
            <Link
              href="/admin"
              onClick={close}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-muted"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              {t('app.nav.admin')}
            </Link>
          )}
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-tint/60"
          >
            <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t('common.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
