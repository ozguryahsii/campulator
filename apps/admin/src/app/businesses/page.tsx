'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AdminBusiness } from '@/lib/api';
import { adminApi } from '@/lib/api';
import type { DictionaryKey } from '@/lib/dictionary';
import { t } from '@/lib/dictionary';

type StatusFilter = 'ALL' | AdminBusiness['verificationStatus'];

const FILTERS: StatusFilter[] = ['PENDING', 'VERIFIED', 'REJECTED', 'ALL'];

const STATUS_STYLE: Record<AdminBusiness['verificationStatus'], string> = {
  PENDING: 'border-fire text-fire',
  VERIFIED: 'border-primary text-primary',
  REJECTED: 'border-danger text-danger',
};

export default function BusinessesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('PENDING');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: adminApi.businesses,
  });

  const verify = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      adminApi.verifyBusiness(id, approve),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-businesses'] }),
  });

  const items = (data?.items ?? []).filter(
    (b) => filter === 'ALL' || b.verificationStatus === filter,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.businesses')}</h1>
      <p className="mt-2 text-sm text-text-secondary">{t('businesses.hint')}</p>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              filter === status
                ? 'border-primary text-primary'
                : 'border-border-soft text-text-secondary'
            }`}
          >
            {t(`businesses.status.${status}` as DictionaryKey)}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}

      {data && items.length === 0 && (
        <p className="mt-8 text-text-secondary">{t('common.empty')}</p>
      )}

      <div className="mt-6 space-y-4">
        {items.map((business) => (
          <div key={business.id} className="rounded-2xl border border-border-soft bg-surface p-5">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold">{business.name}</h2>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      STATUS_STYLE[business.verificationStatus]
                    }`}
                  >
                    {t(`businesses.status.${business.verificationStatus}` as DictionaryKey)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {business.owner ?? '—'}
                  {business.ownerEmail ? ` · ${business.ownerEmail}` : ''} ·{' '}
                  {new Date(business.createdAt).toLocaleDateString('tr-TR')}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  {t('businesses.places')}: {business.places.map((p) => p.name).join(', ') || '—'}
                </p>
              </div>

              {business.verificationStatus === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => verify.mutate({ id: business.id, approve: true })}
                    disabled={verify.isPending}
                    className="rounded-lg border border-primary px-3 py-1.5 text-xs text-primary disabled:opacity-50"
                  >
                    {t('common.approve')}
                  </button>
                  <button
                    onClick={() => verify.mutate({ id: business.id, approve: false })}
                    disabled={verify.isPending}
                    className="rounded-lg border border-danger px-3 py-1.5 text-xs text-danger disabled:opacity-50"
                  >
                    {t('common.reject')}
                  </button>
                </div>
              )}
            </div>

            {/* Sahiplik beyanı: kararın dayanağı */}
            {business.evidence && (
              <div className="mt-4 rounded-xl border border-border-soft bg-elevated p-3">
                <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                  {t('businesses.evidence')}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{business.evidence}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
