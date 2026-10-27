'use client';

import type { PricingRules } from '@mersal/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CopyPlus, Rocket, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PricingEditor,
  PricingSimulator,
  rulesToState,
  stateToRules,
  type EditorState,
} from '@/components/admin/pricing-editor';
import { FormAlert } from '@/components/auth/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useCountryName } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

interface VersionDetail {
  id: string;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  notes: string | null;
  rules: PricingRules;
  corridorId: string;
  corridor: { code: string; originCountry: string; destinationCountry: string };
}

const STATUS_TONE = { DRAFT: 'warning', ACTIVE: 'success', ARCHIVED: 'neutral' } as const;

export default function PricingVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('admin.pricing');
  const tc = useTranslations('common');
  const country = useCountryName();
  const router = useRouter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const version = useQuery({
    queryKey: ['admin', 'pricing', id],
    queryFn: () => api<VersionDetail>(`/admin/pricing/versions/${id}`),
  });
  const [state, setState] = useState<EditorState | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'save' | 'activate' | 'draft' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (version.data) {
      setState(rulesToState(version.data.rules));
      setNotes(version.data.notes ?? '');
    }
  }, [version.data]);

  if (!version.data || !state) return <PageSpinner />;
  const v = version.data;
  const readOnly = v.status !== 'DRAFT';

  async function act(kind: 'save' | 'activate' | 'draft') {
    const rules = stateToRules(state!);
    if (!rules.success) {
      setError(rules.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '));
      return;
    }
    if (kind === 'activate' && !window.confirm(t('activateConfirm'))) return;
    setError(null);
    setBusy(kind);
    try {
      if (kind === 'draft') {
        const draft = await api<{ id: string }>(
          `/admin/pricing/corridors/${v.corridorId}/versions`,
          {
            body: { rules: rules.data, notes: notes || undefined },
          },
        );
        toast.success(t('draftCreated'));
        router.push(`/admin/pricing/${draft.id}`);
      } else {
        await api(`/admin/pricing/versions/${id}`, {
          method: 'PATCH',
          body: { rules: rules.data, notes: notes || undefined },
        });
        if (kind === 'activate')
          await api(`/admin/pricing/versions/${id}/activate`, { method: 'POST' });
        toast.success(kind === 'activate' ? t('activated') : t('saved'));
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'pricing'] });
      await queryClient.invalidateQueries({ queryKey: ['catalog'] });
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Link
        href="/admin/pricing"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {tc('back')}
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {country(v.corridor.originCountry)} → {country(v.corridor.destinationCountry)}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-muted-foreground">
            {t('version', { version: v.version })}
            <Badge tone={STATUS_TONE[v.status]}>{t(`status.${v.status}`)}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {readOnly ? (
            <Button onClick={() => act('draft')} disabled={busy !== null}>
              {busy === 'draft' ? <Spinner /> : <CopyPlus aria-hidden="true" />}
              {t('newDraft')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => act('save')} disabled={busy !== null}>
                {busy === 'save' ? <Spinner /> : <Save aria-hidden="true" />}
                {t('saveDraft')}
              </Button>
              <Button onClick={() => act('activate')} disabled={busy !== null}>
                {busy === 'activate' ? <Spinner /> : <Rocket aria-hidden="true" />}
                {t('activate')}
              </Button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="mb-6">
          <FormAlert tone="info">{t('readOnly')}</FormAlert>
        </div>
      )}
      {error && (
        <div className="mb-6">
          <FormAlert>{error}</FormAlert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Field label={t('notes')}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <PricingEditor state={state} onChange={setState} readOnly={readOnly} />
        </div>
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <PricingSimulator state={state} />
        </aside>
      </div>
    </>
  );
}
