'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, PAGE_SIZE } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { t } from '@/lib/dictionary';

const STATUSES = ['', 'PUBLISHED', 'PENDING_REVIEW', 'REJECTED', 'MERGED', 'ARCHIVED'];

export default function PlacesPage() {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-places', submitted, status, page],
    queryFn: () => adminApi.places(submitted, status, page),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.places')}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSubmitted(search);
              setPage(1);
            }
          }}
          className="w-64 rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        {STATUSES.map((value) => (
          <button
            key={value || 'ALL'}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === value ? 'bg-primary text-background' : 'bg-elevated text-text-secondary'
            }`}
          >
            {value || 'Tümü'}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}

      {data && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border-soft bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border-soft text-left text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3">Nokta</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">CampScore</th>
                <th className="px-4 py-3">{t('places.exactCoords')}</th>
                <th className="px-4 py-3">Ekleyen</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((place) => (
                <tr key={place.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{place.name}</div>
                    <div className="text-xs text-text-secondary">
                      {[place.city, place.feeType, place.locationPrecision]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        place.publicationStatus === 'PUBLISHED'
                          ? 'text-primary'
                          : place.publicationStatus === 'PENDING_REVIEW'
                            ? 'text-fire'
                            : 'text-text-secondary'
                      }
                    >
                      {place.publicationStatus}
                    </span>
                    <div className="text-xs text-text-secondary">{place.operatingStatus}</div>
                  </td>
                  <td className="px-4 py-3">{place.score?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    {place.exactLatitude.toFixed(5)}, {place.exactLongitude.toFixed(5)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{place.createdBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && (
            <p className="p-6 text-text-secondary">{t('common.empty')}</p>
          )}
        </div>
      )}

      {data && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
