'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, PAGE_SIZE, type ModerationItem } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { t } from '@/lib/dictionary';

function SubjectDetails({ item }: { item: ModerationItem }) {
  const subject = item.subject as Record<string, string | number | null> | null;
  if (!subject) return <span className="text-text-secondary">{item.itemId}</span>;

  if (subject.kind === 'PLACE') {
    return (
      <div>
        <div className="font-semibold text-text-primary">{subject.name}</div>
        <div className="text-xs text-text-secondary">
          {[subject.city, `${t('moderation.submittedBy')}: ${subject.submittedBy ?? '—'}`]
            .filter(Boolean)
            .join(' · ')}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {subject.latitude}, {subject.longitude} · {subject.trustLevel}
        </div>
      </div>
    );
  }
  if (subject.kind === 'CHANGE_REQUEST') {
    return (
      <div>
        <div className="font-semibold text-text-primary">{subject.placeName}</div>
        <div className="text-xs text-text-secondary">
          {subject.type} · {t('moderation.submittedBy')}: {subject.submittedBy ?? '—'}
        </div>
        {subject.evidence && (
          <div className="mt-1 text-xs text-text-secondary">{subject.evidence}</div>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="font-semibold text-text-primary">{subject.category}</div>
      <div className="text-xs text-text-secondary">
        {subject.targetType} · {subject.description ?? ''}
      </div>
    </div>
  );
}

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['moderation', page],
    queryFn: () => adminApi.moderation('PENDING', page),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['moderation'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const resolve = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVE' | 'REJECT' | 'ARCHIVE' }) =>
      adminApi.resolve(id, decision, notes[id]),
    onSuccess: invalidate,
    onError: () => setMessage(t('common.error')),
  });

  // Binlerce içe aktarılmış noktayı tek tek onaylamak pratik değil
  const bulk = useMutation({
    mutationFn: (dataSource?: string) => adminApi.bulkResolve('APPROVE', dataSource),
    onSuccess: (result) => {
      setMessage(`${result.places} ${t('moderation.bulkDone')}`);
      invalidate();
    },
    onError: () => setMessage(t('common.error')),
  });

  // Yarıda kesilen onaylar iki tarafı ayrıştırabiliyor; bu onları onarır
  const reconcile = useMutation({
    mutationFn: () => adminApi.reconcileModeration(),
    onSuccess: (result) => {
      setMessage(
        `${result.publishedFromApproved} / ${result.closedStaleItems} ${t('moderation.reconcileDone')}`,
      );
      invalidate();
    },
    onError: () => setMessage(t('common.error')),
  });

  const merge = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      adminApi.merge(sourceId, targetId),
    onSuccess: invalidate,
    onError: () => setMessage(t('common.error')),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.moderation')}</h1>
      <p className="mt-2 text-sm text-text-secondary">{t('moderation.fifoNote')}</p>
      {message && <p className="mt-2 text-sm text-danger">{message}</p>}

      {/* Toplu işlemler — içe aktarım sonrası kuyruğu tek tıkla boşaltmak için */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            if (window.confirm(t('moderation.bulkConfirm'))) bulk.mutate('openstreetmap');
          }}
          disabled={bulk.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background disabled:opacity-50"
        >
          {t('moderation.approveImports')}
        </button>
        <button
          onClick={() => {
            if (window.confirm(t('moderation.bulkConfirm'))) bulk.mutate(undefined);
          }}
          disabled={bulk.isPending}
          className="rounded-lg border border-border-soft px-4 py-2 text-sm text-text-primary disabled:opacity-50"
        >
          {t('moderation.approveAll')}
        </button>
        <button
          onClick={() => reconcile.mutate()}
          disabled={reconcile.isPending}
          className="rounded-lg border border-border-soft px-4 py-2 text-sm text-text-secondary disabled:opacity-50"
        >
          {t('moderation.reconcile')}
        </button>
      </div>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}

      {data && data.items.length === 0 && (
        <p className="mt-8 text-text-secondary">{t('common.empty')}</p>
      )}

      <div className="mt-6 space-y-4">
        {data?.items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border-soft bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-bold text-primary">
                  {item.itemType}
                </span>
                <div className="mt-3">
                  <SubjectDetails item={item} />
                </div>
                {item.reason && <p className="mt-2 text-xs text-text-secondary">{item.reason}</p>}
                <p className="mt-1 text-xs text-text-secondary">
                  {new Date(item.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>

            <input
              placeholder={t('moderation.note')}
              value={notes[item.id] ?? ''}
              onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
              className="mt-4 w-full rounded-lg border border-border-soft bg-elevated px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => resolve.mutate({ id: item.id, decision: 'APPROVE' })}
                disabled={resolve.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background disabled:opacity-50"
              >
                {t('common.approve')}
              </button>
              <button
                onClick={() => resolve.mutate({ id: item.id, decision: 'REJECT' })}
                disabled={resolve.isPending}
                className="rounded-lg border border-danger px-4 py-2 text-sm text-danger disabled:opacity-50"
              >
                {t('common.reject')}
              </button>
              <button
                onClick={() => resolve.mutate({ id: item.id, decision: 'ARCHIVE' })}
                disabled={resolve.isPending}
                className="rounded-lg border border-border-soft px-4 py-2 text-sm text-text-secondary disabled:opacity-50"
              >
                {t('common.archive')}
              </button>
            </div>

            {/* Mükerrer birleştirme: kaynak bu nokta, hedefi admin girer */}
            {item.itemType === 'DUPLICATE' && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
                <input
                  placeholder={t('moderation.mergeInto')}
                  value={mergeTargets[item.itemId] ?? ''}
                  onChange={(e) =>
                    setMergeTargets({ ...mergeTargets, [item.itemId]: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-border-soft bg-elevated px-3 py-2 text-xs outline-none focus:border-primary"
                />
                <button
                  onClick={() =>
                    merge.mutate({
                      sourceId: item.itemId,
                      targetId: mergeTargets[item.itemId] ?? '',
                    })
                  }
                  disabled={!mergeTargets[item.itemId] || merge.isPending}
                  className="rounded-lg bg-fire px-4 py-2 text-sm font-bold text-background disabled:opacity-50"
                >
                  {t('moderation.merge')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {data && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
