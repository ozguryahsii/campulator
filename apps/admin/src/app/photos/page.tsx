'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, API_URL } from '@/lib/api';
import { t } from '@/lib/dictionary';

/** Dış kaynaklı fotoğraf tam URL döner; kendi depomuzdaki göreli gelir. */
function mediaUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export default function PhotosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-photos'],
    queryFn: () => adminApi.photos('PENDING'),
  });

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      adminApi.resolvePhoto(id, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.photos')}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Onaylanmayan fotoğraf uygulamada görünmez. İçe aktarımdan gelen adaylar noktaya yakın
        çekilmiş olsa da başka bir yeri gösteriyor olabilir; noktaya ait değilse kaldırın.
      </p>

      {isLoading && <p className="mt-8 text-text-secondary">{t('common.loading')}</p>}
      {data && data.items.length === 0 && (
        <p className="mt-8 text-text-secondary">{t('common.empty')}</p>
      )}

      {data && data.items.length > 0 && (
        <p className="mt-6 text-sm text-text-secondary">{data.total} fotoğraf onay bekliyor</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((photo) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-border-soft bg-surface"
          >
            {mediaUrl(photo.url) ? (
              /* Dış kaynaklı görseller için next/image yerine img: alan adları
                 önceden bilinmiyor, uzak yükleyici tanımlanamıyor. */
              <img
                src={mediaUrl(photo.url) as string}
                alt={photo.placeName ?? 'Fotoğraf'}
                className="h-48 w-full bg-elevated object-cover"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-elevated text-sm text-text-secondary">
                Görsel yüklenemedi
              </div>
            )}

            <div className="p-4">
              <div className="text-sm font-bold">{photo.placeName ?? '—'}</div>
              <div className="text-xs text-text-secondary">
                {[photo.placeCity, photo.uploadedBy ?? 'İçe aktarım'].filter(Boolean).join(' · ')}
              </div>

              {photo.attribution && (
                <p className="mt-2 text-xs text-text-secondary">{photo.attribution}</p>
              )}
              {photo.sourceUrl && (
                <a
                  href={photo.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-xs text-primary underline"
                >
                  Kaynak sayfa
                </a>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => resolve.mutate({ id: photo.id, action: 'APPROVE' })}
                  disabled={resolve.isPending}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-background disabled:opacity-50"
                >
                  Yayımla
                </button>
                <button
                  onClick={() => resolve.mutate({ id: photo.id, action: 'REJECT' })}
                  disabled={resolve.isPending}
                  className="flex-1 rounded-lg border border-border-soft px-3 py-2 text-sm text-text-secondary disabled:opacity-50"
                >
                  Kaldır
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
