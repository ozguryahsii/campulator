import { apiRequest } from './client';

export interface RoutePreview {
  provider: 'ESTIMATE' | 'GOOGLE_PENDING' | 'GOOGLE';
  travelMode: 'DRIVE' | 'WALK';
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  destinationPrecision: 'EXACT' | 'APPROXIMATE';
  distanceMeters: number;
  estimatedDurationSeconds: number;
  polyline: { latitude: number; longitude: number }[];
  externalMapsUrl: string;
}

export const routesApi = {
  preview: (body: {
    origin: { latitude: number; longitude: number };
    placeId: string;
    travelMode?: 'DRIVE' | 'WALK';
  }) => apiRequest<RoutePreview>('/routes/preview', { method: 'POST', body }),
};

/** Mesafe/süre biçimleme — Intl ile yerelleştirilmiş (docs/02 §12) */
export function formatDistance(meters: number, locale: string): string {
  if (meters < 1000) return `${meters} m`;
  const km = meters / 1000;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
}

/** Süre biçimleme; birim etiketleri i18n'den gelir (hardcoded metin yok) */
export function formatDuration(
  seconds: number,
  locale: string,
  units: { hour: string; minute: string },
): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const nf = new Intl.NumberFormat(locale);
  if (hours === 0) return `${nf.format(minutes)} ${units.minute}`;
  if (minutes === 0) return `${nf.format(hours)} ${units.hour}`;
  return `${nf.format(hours)} ${units.hour} ${nf.format(minutes)} ${units.minute}`;
}
