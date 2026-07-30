/**
 * Fotoğraf yanıt biçimlendirme. Fotoğraf ya bizim depomuzda (storageKey) ya da
 * dış kaynakta (OpenStreetMap içe aktarımıyla gelen Wikimedia görselleri) durur.
 * İstemci tek bir `url` alanına bakar: göreli ise API tabanına eklenir.
 */
export interface PhotoLike {
  id: string;
  storageKey: string;
  externalUrl?: string | null;
  attribution?: string | null;
  license?: string | null;
  sourceUrl?: string | null;
}

export function photoUrl(photo: Pick<PhotoLike, 'storageKey' | 'externalUrl'>): string | null {
  if (photo.externalUrl) return photo.externalUrl;
  return photo.storageKey ? `/storage/${photo.storageKey}` : null;
}

export function toPhotoResponse(photo: PhotoLike) {
  return {
    id: photo.id,
    storageKey: photo.storageKey,
    url: photoUrl(photo),
    attribution: photo.attribution ?? null,
    license: photo.license ?? null,
    sourceUrl: photo.sourceUrl ?? null,
  };
}
