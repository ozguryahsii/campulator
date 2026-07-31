'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { t } from '@/lib/dictionary';

export default function LocalizationPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: places } = useQuery({
    queryKey: ['admin-places', submitted],
    queryFn: () => adminApi.places(submitted),
  });

  const { data: translations } = useQuery({
    queryKey: ['admin-translations', placeId],
    queryFn: () => adminApi.translations(placeId!),
    enabled: !!placeId,
  });

  // Seçilen nokta değiştiğinde form mevcut EN çevirisiyle doldurulur
  useEffect(() => {
    const en = translations?.translations.find((tr) => tr.locale === 'en');
    setName(en?.name ?? '');
    setDescription(en?.description ?? '');
    setSaved(false);
  }, [translations]);

  const save = useMutation({
    mutationFn: () => adminApi.saveTranslation(placeId!, 'en', { name, description }),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ['admin-translations', placeId] });
    },
  });

  const field =
    'w-full rounded-lg border border-border-soft bg-elevated px-3 py-2 text-sm outline-none focus:border-primary';

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.localization')}</h1>
      <p className="mt-2 text-sm text-text-secondary">{t('localization.hint')}</p>

      <input
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && setSubmitted(search)}
        className="mt-4 w-64 rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Nokta listesi */}
        <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-border-soft bg-surface">
          {places?.items.map((place) => (
            <button
              key={place.id}
              onClick={() => setPlaceId(place.id)}
              className={`block w-full border-b border-border-soft px-4 py-3 text-left text-sm last:border-0 ${
                placeId === place.id ? 'bg-elevated text-primary' : ''
              }`}
            >
              <div className="font-medium">{place.name}</div>
              <div className="text-xs text-text-secondary">{place.city ?? '—'}</div>
            </button>
          ))}
          {places && places.items.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-secondary">{t('common.empty')}</p>
          )}
        </div>

        {/* Çeviri formu */}
        <div className="rounded-2xl border border-border-soft bg-surface p-5">
          {!translations ? (
            <p className="text-sm text-text-secondary">{t('localization.selectPlace')}</p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                  {t('localization.default')}
                </div>
                <p className="mt-1 font-semibold">{translations.defaultName}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                  {translations.defaultDescription ?? '—'}
                </p>
              </div>

              <div className="border-t border-border-soft pt-5">
                <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                  {t('localization.english')}
                </div>
                <label className="mt-3 block text-xs text-text-secondary">
                  {t('localization.name')}
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={translations.defaultName}
                  className={`mt-1 ${field}`}
                />
                <label className="mt-4 block text-xs text-text-secondary">
                  {t('localization.description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setSaved(false);
                  }}
                  rows={6}
                  placeholder={translations.defaultDescription ?? ''}
                  className={`mt-1 ${field}`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="rounded-lg border border-primary px-4 py-2 text-sm text-primary disabled:opacity-50"
                >
                  {t('common.save')}
                </button>
                {saved && <span className="text-sm text-primary">{t('localization.saved')}</span>}
                {save.isError && <span className="text-sm text-danger">{t('common.error')}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
