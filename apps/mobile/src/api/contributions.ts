import { apiRequest } from './client';

/** Değişiklik önerisi türleri (moderasyon kuyruğunda "reason" olarak görünür) */
export const CHANGE_REQUEST_TYPES = [
  'NAME',
  'DESCRIPTION',
  'LOCATION',
  'AMENITY',
  'FEE',
  'ACCESS',
  'STATUS',
  'OTHER',
] as const;
export type ChangeRequestType = (typeof CHANGE_REQUEST_TYPES)[number];

/** Nokta şikâyet kategorileri (docs/01 §20) */
export const REPORT_CATEGORIES = [
  'INCORRECT_INFO',
  'WRONG_LOCATION',
  'CLOSED_BUSINESS',
  'SAFETY_RISK',
  'PROHIBITED_ACTIVITY',
  'INAPPROPRIATE_PHOTO',
  'SPAM',
  'OTHER',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export interface DuplicateCandidate {
  id: string;
  name: string;
  slug: string;
  distanceMeters: number;
  similarName: boolean;
}

export const contributionsApi = {
  /** Form doldurulurken anlık mükerrer uyarısı (docs/01 §14) */
  duplicateCheck: (latitude: number, longitude: number, name: string) =>
    apiRequest<DuplicateCandidate[]>(
      `/places/duplicate-check?latitude=${latitude}&longitude=${longitude}&name=${encodeURIComponent(name)}`,
    ),

  /** Bilgi düzeltme önerisi; moderasyon onayına düşer */
  changeRequest: (placeId: string, body: { type: ChangeRequestType; note: string }) =>
    apiRequest<{ id: string; status: string }>(`/places/${placeId}/change-requests`, {
      method: 'POST',
      body: {
        type: body.type,
        payload: { note: body.note },
        evidenceText: body.note,
      },
      auth: true,
    }),

  /** Hızlı doğrulama: bilgiler doğru / kapalı görünüyor */
  verify: (placeId: string, verdict: 'CONFIRMED' | 'DISPUTED' | 'CLOSED_REPORTED') =>
    apiRequest<{ id: string; verdict: string }>(`/places/${placeId}/verifications`, {
      method: 'POST',
      body: { targetType: 'PLACE', verdict },
      auth: true,
    }),

  report: (placeId: string, body: { category: ReportCategory; description?: string }) =>
    apiRequest<{ id: string; status: string }>(`/places/${placeId}/report`, {
      method: 'POST',
      body,
      auth: true,
    }),
};
