'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { t } from '@/lib/dictionary';

export default function ScoreConfigPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['score-config'],
    queryFn: adminApi.scoreConfig,
  });

  const [features, setFeatures] = useState(0.45);
  const [userRating, setUserRating] = useState(0.35);
  const [atmosphere, setAtmosphere] = useState(0.2);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setFeatures(data.weights.features);
      setUserRating(data.weights.userRating);
      setAtmosphere(data.weights.atmosphere);
    }
  }, [data]);

  const sum = Number((features + userRating + atmosphere).toFixed(3));
  const valid = Math.abs(sum - 1) < 0.001;

  const update = useMutation({
    mutationFn: () => adminApi.updateScoreConfig({ features, userRating, atmosphere }),
    onSuccess: (result) => {
      setMessage(t('score.recalculated').replace('{count}', String(result.recalculated)));
      void queryClient.invalidateQueries({ queryKey: ['score-config'] });
    },
    onError: () => setMessage(t('common.error')),
  });

  const slider = (label: string, value: number, onChange: (v: number) => void) => (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="font-mono text-sm font-bold text-primary">%{Math.round(value * 100)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.scoreConfig')}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        CampScore = (Özellikler × w₁) + (Kullanıcı Puanı × w₂) + (Atmosfer × w₃)
      </p>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}

      {data && (
        <>
          <div className="mt-6 max-w-xl rounded-2xl border border-border-soft bg-surface p-6">
            {slider(t('score.features'), features, setFeatures)}
            {slider(t('score.userRating'), userRating, setUserRating)}
            {slider(t('score.atmosphere'), atmosphere, setAtmosphere)}

            <div className="flex items-center justify-between border-t border-border-soft pt-4">
              <span className={`text-sm ${valid ? 'text-primary' : 'text-danger'}`}>
                Toplam: {sum.toFixed(2)}
                {!valid && ` — ${t('score.sumWarning')}`}
              </span>
              <button
                onClick={() => update.mutate()}
                disabled={!valid || update.isPending}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-background disabled:opacity-50"
              >
                {update.isPending ? '...' : t('common.save')}
              </button>
            </div>
            {message && <p className="mt-3 text-sm text-primary">{message}</p>}
          </div>

          <h2 className="mt-10 text-lg font-bold">{t('score.amenityWeights')}</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border-soft bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border-soft text-left text-xs uppercase text-text-secondary">
                <tr>
                  <th className="px-4 py-3">İmkân</th>
                  <th className="px-4 py-3">Ağırlık</th>
                  <th className="px-4 py-3">Aktivite maskesi</th>
                </tr>
              </thead>
              <tbody>
                {data.amenities.map((amenity) => (
                  <tr key={amenity.id} className="border-b border-border-soft last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{amenity.code}</td>
                    <td className="px-4 py-2.5">{amenity.weight}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {amenity.applicableActivityMask}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
