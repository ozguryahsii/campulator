'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi, type DashboardCounts } from '@/lib/api';
import { t, type DictionaryKey } from '@/lib/dictionary';

const CARDS: { key: keyof DashboardCounts; label: DictionaryKey; accent?: boolean }[] = [
  { key: 'pendingModeration', label: 'dashboard.pendingModeration', accent: true },
  { key: 'pendingPlaces', label: 'dashboard.pendingPlaces', accent: true },
  { key: 'openReports', label: 'dashboard.openReports', accent: true },
  { key: 'changeRequests', label: 'dashboard.changeRequests' },
  { key: 'publishedPlaces', label: 'dashboard.publishedPlaces' },
  { key: 'activeUsers', label: 'dashboard.activeUsers' },
  { key: 'reviews', label: 'dashboard.reviews' },
  { key: 'photos', label: 'dashboard.photos' },
  { key: 'verifiedBusinesses', label: 'dashboard.verifiedBusinesses' },
];

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: adminApi.dashboard,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.dashboard')}</h1>
      <p className="mt-2 text-text-secondary">{t('dashboard.welcome')}</p>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}
      {isError && <p className="mt-8 text-danger">{t('common.error')}</p>}

      {data && (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.key}
              className={`rounded-2xl border bg-surface p-6 ${
                card.accent && data[card.key] > 0 ? 'border-primary' : 'border-border-soft'
              }`}
            >
              <div
                className={`text-3xl font-extrabold ${
                  card.accent && data[card.key] > 0 ? 'text-primary' : 'text-text-primary'
                }`}
              >
                {data[card.key]}
              </div>
              <div className="mt-1 text-sm text-text-secondary">{t(card.label)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
