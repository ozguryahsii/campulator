'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { t } from '@/lib/dictionary';

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: adminApi.auditLogs,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.auditLogs')}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Tüm moderasyon ve skor etkileyen işlemler kayıt altındadır.
      </p>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}

      {data && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border-soft bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border-soft text-left text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3">{t('audit.date')}</th>
                <th className="px-4 py-3">{t('audit.actor')}</th>
                <th className="px-4 py-3">{t('audit.action')}</th>
                <th className="px-4 py-3">{t('audit.entity')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((log) => (
                <tr key={log.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-2.5 text-xs text-text-secondary">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2.5">{log.actor}</td>
                  <td className="px-4 py-2.5 font-semibold text-primary">{log.action}</td>
                  <td className="px-4 py-2.5 text-xs text-text-secondary">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && (
            <p className="p-6 text-text-secondary">{t('common.empty')}</p>
          )}
        </div>
      )}
    </div>
  );
}
