import { apiRequest, apiUpload } from './client';

export interface RatingInput {
  cleanliness: number;
  safety: number;
  scenery: number;
  accessibility: number;
  valueForMoney: number;
}

export interface RatingSummary {
  count: number;
  overall: number;
  categories: RatingInput & { [key: string]: number };
}

export interface ReviewItem {
  id: string;
  body: string;
  helpfulCount: number;
  createdAt: string;
  user: { id: string; displayName: string; trustLevel: string };
  rating: number | null;
  photos: { id: string; storageKey: string }[];
  replies: {
    id: string;
    body: string;
    isOfficialResponse: boolean;
    createdAt: string;
    user: { id: string; displayName: string };
  }[];
  isMine: boolean;
}

export type ReviewSort = 'newest' | 'helpful' | 'highest' | 'lowest' | 'with_photos';

export const reviewsApi = {
  summary: (placeId: string) => apiRequest<RatingSummary>(`/places/${placeId}/ratings/summary`),
  myRating: (placeId: string) =>
    apiRequest<(RatingInput & { overall: number }) | null>(`/places/${placeId}/ratings/me`, {
      auth: true,
    }),
  rate: (placeId: string, body: RatingInput) =>
    apiRequest<{ overall: number }>(`/places/${placeId}/ratings`, {
      method: 'POST',
      body,
      auth: true,
    }),
  list: (placeId: string, sort: ReviewSort) =>
    apiRequest<{ total: number; items: ReviewItem[] }>(`/places/${placeId}/reviews?sort=${sort}`, {
      auth: true,
    }),
  create: (placeId: string, body: { body: string }) =>
    apiRequest<ReviewItem>(`/places/${placeId}/reviews`, { method: 'POST', body, auth: true }),
  helpful: (reviewId: string, on: boolean) =>
    apiRequest<{ helpfulCount: number }>(`/reviews/${reviewId}/helpful`, {
      method: on ? 'POST' : 'DELETE',
      auth: true,
    }),
  uploadPlacePhoto: (placeId: string, uri: string, mimeType: string) =>
    apiUpload<{ id: string; url: string }>(`/places/${placeId}/photos`, uri, mimeType),
};
