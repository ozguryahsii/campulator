'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pagination } from '@/components/Pagination';
import { adminApi, PAGE_SIZE } from '@/lib/api';
import { t } from '@/lib/dictionary';

const TRUST_LEVELS = ['NEW_USER', 'CONTRIBUTOR', 'TRUSTED_CONTRIBUTOR', 'EXPERT_CAMPER'];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', submitted, page],
    queryFn: () => adminApi.users(submitted, page),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const setTrust = useMutation({
    mutationFn: ({ id, level }: { id: string; level: string }) => adminApi.setTrustLevel(id, level),
    onSuccess: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      adminApi.setUserStatus(id, status),
    onSuccess: invalidate,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.users')}</h1>

      <input
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && setSubmitted(search)}
        className="mt-4 w-64 rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}

      {data && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border-soft bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border-soft text-left text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">{t('users.trustLevel')}</th>
                <th className="px-4 py-3">{t('users.trustScore')}</th>
                <th className="px-4 py-3">{t('users.stats')}</th>
                <th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={user.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{user.displayName ?? '—'}</div>
                    <div className="text-xs text-text-secondary">
                      {user.email ?? '—'}
                      {!user.emailVerified && <span className="text-fire"> · doğrulanmadı</span>}
                    </div>
                    <div className="text-xs text-text-secondary">{user.role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.trustLevel}
                      onChange={(e) => setTrust.mutate({ id: user.id, level: e.target.value })}
                      className="rounded-lg border border-border-soft bg-elevated px-2 py-1.5 text-xs outline-none focus:border-primary"
                    >
                      {TRUST_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Sayısal güven puanı yalnızca admin panelinde görünür */}
                  <td className="px-4 py-3 font-mono">{user.trustScore}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {user.stats.places} nokta · {user.stats.reviews} yorum · {user.stats.photos}{' '}
                    foto
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        setStatus.mutate({
                          id: user.id,
                          status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                        user.status === 'ACTIVE'
                          ? 'border-danger text-danger'
                          : 'border-primary text-primary'
                      }`}
                    >
                      {user.status === 'ACTIVE' ? t('users.suspend') : t('users.activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
