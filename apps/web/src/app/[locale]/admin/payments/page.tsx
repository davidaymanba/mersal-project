'use client';

import { PaymentStatus, type Paginated } from '@mersal/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Undo2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { EmptyState, PageHeader, Pagination, Table } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

interface AdminPayment {
  id: string;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  provider: string;
  createdAt: string;
  shipment: { id: string; reference: string; status: string };
  user: { id: string; firstName: string; lastName: string; email: string };
}

const PAYMENT_TONE = {
  REQUIRES_PAYMENT: 'neutral',
  PROCESSING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  REFUNDED: 'warning',
  PARTIALLY_REFUNDED: 'warning',
} as const;

function RefundDialog({ payment, onClose }: { payment: AdminPayment; onClose: () => void }) {
  const t = useTranslations('admin.payments');
  const money = useMoney();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const refundable = payment.amount - payment.refundedAmount;
  const [amount, setAmount] = useState(String(refundable / 100));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api(`/admin/payments/${payment.id}/refund`, {
        body: { amount: Math.round(Number(amount.replace(',', '.')) * 100), reason },
      });
      toast.success(t('refunded'));
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`${t('refund')} · ${payment.shipment.reference}`}>
      <div className="flex flex-col gap-4">
        <Field label={t('refundAmount')} hint={`≤ ${money(refundable, payment.currency)}`}>
          <Input
            inputMode="decimal"
            dir="ltr"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label={t('refundReason')}>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button variant="danger" onClick={submit} disabled={busy || reason.trim().length < 3}>
          {busy ? <Spinner /> : <Undo2 aria-hidden="true" />}
          {t('refund')}
        </Button>
      </div>
    </Dialog>
  );
}

export default function AdminPaymentsPage() {
  const t = useTranslations('admin.payments');
  const tc = useTranslations('common');
  const money = useMoney();
  const format = useFormatter();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState<AdminPayment | null>(null);
  const list = useQuery({
    queryKey: ['admin', 'payments', status, page],
    queryFn: () =>
      api<Paginated<AdminPayment>>(
        `/admin/payments?page=${page}${status ? `&status=${status}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={list.data && tc('results', { count: list.data.total })}
      />
      <Select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
        className="mb-4 w-auto"
        aria-label={t('columns.status')}
      >
        <option value="">
          {t('columns.status')}: {tc('all')}
        </option>
        {Object.values(PaymentStatus).map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </Select>
      {!list.data ? (
        <PageSpinner />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={tc('results', { count: 0 })} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>{t('columns.shipment')}</th>
                <th>{t('columns.payer')}</th>
                <th>{t('columns.amount')}</th>
                <th>{t('columns.refunded')}</th>
                <th>{t('columns.status')}</th>
                <th>{t('columns.date')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/admin/shipments/${p.shipment.id}`}
                      className="font-mono text-xs text-ink hover:text-primary"
                      dir="ltr"
                    >
                      {p.shipment.reference}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{p.provider}</span>
                  </td>
                  <td className="text-muted-foreground">
                    {p.user.firstName} {p.user.lastName}
                  </td>
                  <td className="text-ink tabular-nums">{money(p.amount, p.currency)}</td>
                  <td className="text-muted-foreground tabular-nums">
                    {p.refundedAmount ? money(p.refundedAmount, p.currency) : '—'}
                  </td>
                  <td>
                    <Badge tone={PAYMENT_TONE[p.status]}>{t(`status.${p.status}`)}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {format.dateTime(new Date(p.createdAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="text-end">
                    {(p.status === 'SUCCEEDED' || p.status === 'PARTIALLY_REFUNDED') && (
                      <Button size="sm" variant="secondary" onClick={() => setRefunding(p)}>
                        {t('refund')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            onChange={setPage}
          />
        </>
      )}
      {refunding && <RefundDialog payment={refunding} onClose={() => setRefunding(null)} />}
    </>
  );
}
