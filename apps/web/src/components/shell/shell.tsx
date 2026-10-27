'use client';

import type { MeResponse } from '@mersal/shared';
import type { LucideIcon } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { useRealtimeNotifications } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (for section roots like /app). */
  exact?: boolean;
  badge?: ReactNode;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

interface ShellProps {
  me: MeResponse;
  sections: NavSection[];
  tag?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function Shell({ me, sections, tag, footer, children }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useRealtimeNotifications();

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && (
            <p className="mb-2 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {section.title}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item) ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item)
                      ? 'bg-tint text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-ink',
                  )}
                >
                  <item.icon className="size-[1.1rem] shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <Link href="/" aria-label="Mersal">
            <Logo />
          </Link>
          {tag}
        </div>
        {nav}
        {footer && <div className="border-t border-border p-3">{footer}</div>}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between px-4">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5!" aria-hidden="true" />
              </Button>
            </div>
            {nav}
            {footer && <div className="border-t border-border p-3">{footer}</div>}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <Menu className="size-5!" aria-hidden="true" />
          </Button>
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher className="hidden sm:flex" />
            <NotificationBell />
            <UserMenu me={me} />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
