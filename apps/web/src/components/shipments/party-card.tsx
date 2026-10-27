'use client';

import type { PublicProfile } from '@mersal/shared';
import { BadgeCheck, Star } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Avatar } from '@/components/shell/user-menu';

/** The other party of a shipment, without any contact details. */
export function PartyCard({
  title,
  profile,
  departureDate,
}: {
  title: string;
  profile: PublicProfile;
  departureDate?: string;
}) {
  const t = useTranslations('shipments.detail');
  const format = useFormatter();

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 font-semibold text-ink">{title}</h2>
      <div className="flex items-center gap-3">
        <Avatar
          firstName={profile.firstName}
          lastName={profile.lastInitial}
          className="size-12 text-base"
        />
        <div>
          <p className="flex items-center gap-1.5 font-medium text-ink">
            {profile.firstName} {profile.lastInitial}.
            {profile.verified && (
              <BadgeCheck className="size-4 text-primary" aria-label={t('verifiedTraveller')} />
            )}
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {profile.ratingCount > 0 && profile.ratingAvg !== null ? (
              <>
                <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
                {t('rating', {
                  rating: format.number(profile.ratingAvg, { maximumFractionDigits: 1 }),
                  count: profile.ratingCount,
                })}
              </>
            ) : (
              t('newMember')
            )}
          </p>
        </div>
      </div>
      {departureDate && (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-ink">
          {t('departure', {
            date: format.dateTime(new Date(`${departureDate}T00:00:00`), { dateStyle: 'full' }),
          })}
        </p>
      )}
    </section>
  );
}
