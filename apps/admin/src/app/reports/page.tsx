'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { t } from '@/lib/dictionary';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminApi.reports('OPEN'),
  });

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'RESOLVE' | 'DISMISS' }) =>
      adminApi.resolveReport(id, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.reports')}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Şikâyet edilen içerik karar verilene kadar yayında kalır.
      </p>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}
      {data && data.items.length === 0 && (
        <p className="mt-8 text-text-secondary">{t('common.empty')}</p>
      )}

      <div className="mt-6 space-y-3">
        {data?.items.map((report) => (
          <div
            key={report.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border-soft bg-surface p-5"
          >
            <div className="flex-1">
              <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-bold text-fire">
                {report.category}
              </span>
              <div className="mt-2 text-sm">
                {report.targetType} · <span className="font-mono text-xs">{report.targetId}</span>
              </div>
              {report.description && (
                <p className="mt-1 text-sm text-text-secondary">{report.description}</p>
              )}
              <p className="mt-1 text-xs text-text-secondary">
                {report.reportedBy ?? '—'} · {new Date(report.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resolve.mutate({ id: report.id, action: 'RESOLVE' })}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background"
              >
                {t('reports.resolve')}
              </button>
              <button
                onClick={() => resolve.mutate({ id: report.id, action: 'DISMISS' })}
                className="rounded-lg border border-border-soft px-4 py-2 text-sm text-text-secondary"
              >
                {t('reports.dismiss')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
