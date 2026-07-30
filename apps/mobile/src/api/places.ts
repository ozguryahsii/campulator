import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';
import { MOCK_PLACES } from './mockPlaces';

export type ActivityCode = 'CARAVAN' | 'TENT' | 'PICNIC' | 'BARBECUE';
export type FeeType = 'FREE' | 'PAID' | 'UNKNOWN';
export type OperatingStatus = 'OPEN' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED' | 'SEASONAL';

export interface PlaceListItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
  locationPrecision: 'EXACT' | 'APPROXIMATE';
  approximateRadiusMeters: number | null;
  feeType: FeeType;
  operatingStatus: OperatingStatus;
  primaryActivity: ActivityCode | null;
  activities: ActivityCode[];
  tags?: string[];
  photoStatus: 'PENDING' | 'PUBLISHED' | 'REMOVED';
  score: {
    overall: number;
    features: number;
    userRating: number;
    atmosphere: number;
  } | null;
}

export interface PlacesResponse {
  total: number;
  page: number;
  pageSize: number;
  items: PlaceListItem[];
}

export interface PlaceDetail extends PlaceListItem {
  description: string | null;
  seasonalOpenFrom: number | null;
  seasonalOpenTo: number | null;
  amenities: {
    code: string;
    nameKey: string;
    verificationStatus: string;
    lastVerifiedAt: string | null;
  }[];
  access: {
    roadType: string;
    normalCar: boolean;
    highClearance: boolean;
    fourByFourRequired: boolean;
  } | null;
  atmosphere: {
    cellSignal: number | null;
    quietness: number | null;
    crowdLevel: number | null;
    privacy: number | null;
    nightCalm: number | null;
    socialLevel: number | null;
  } | null;
  photos: { id: string; storageKey: string }[];
  lastVerifiedAt: string | null;
}

export interface ScoreBreakdown {
  placeId: string;
  overall: number;
  label: string;
  components: {
    features: {
      score: number;
      weight: number;
      applicableAmenities: number;
      presentAmenities: number;
    };
    userRating: { score: number; weight: number; ratingCount: number };
    atmosphere: { score: number; weight: number };
  };
}

export function usePlaceDetail(placeId: string, fallback?: PlaceListItem) {
  return useQuery({
    queryKey: ['place', placeId],
    queryFn: async (): Promise<{ data: PlaceDetail | PlaceListItem; offline: boolean }> => {
      try {
        const data = await apiRequest<PlaceDetail>(`/places/${placeId}`);
        return { data, offline: false };
      } catch {
        if (fallback) return { data: fallback, offline: true };
        throw new Error('PLACE_UNAVAILABLE');
      }
    },
  });
}

export function useScoreBreakdown(placeId: string) {
  return useQuery({
    queryKey: ['score-breakdown', placeId],
    queryFn: () => apiRequest<ScoreBreakdown>(`/places/${placeId}/score-breakdown`),
    retry: 0,
  });
}

export interface PlaceFilters {
  search?: string;
  activities?: ActivityCode[];
  feeType?: 'FREE' | 'PAID';
  amenities?: string[];
  tags?: string[];
  minRating?: number;
  includePermanentlyClosed?: boolean;
}

function buildQuery(filters: PlaceFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.activities?.length) params.set('activities', filters.activities.join(','));
  if (filters.feeType) params.set('feeType', filters.feeType);
  if (filters.amenities?.length) params.set('amenities', filters.amenities.join(','));
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.minRating) params.set('minRating', String(filters.minRating));
  if (filters.includePermanentlyClosed) params.set('includePermanentlyClosed', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Filtreleri mock veri üzerinde uygular (API erişilemezse demo modu). */
function filterMock(filters: PlaceFilters): PlacesResponse {
  let items = filters.includePermanentlyClosed
    ? [...MOCK_PLACES]
    : MOCK_PLACES.filter((p) => p.operatingStatus !== 'PERMANENTLY_CLOSED');
  if (filters.minRating) {
    items = items.filter((p) => (p.score?.userRating ?? 0) >= filters.minRating!);
  }
  if (filters.search) {
    const term = filters.search.toLocaleLowerCase('tr');
    items = items.filter(
      (p) =>
        p.name.toLocaleLowerCase('tr').includes(term) ||
        p.city?.toLocaleLowerCase('tr').includes(term) ||
        p.region?.toLocaleLowerCase('tr').includes(term),
    );
  }
  if (filters.feeType) items = items.filter((p) => p.feeType === filters.feeType);
  if (filters.activities?.length) {
    items = items.filter((p) => filters.activities!.some((a) => p.activities.includes(a)));
  }
  return { total: items.length, page: 1, pageSize: items.length, items };
}

export function usePlaces(filters: PlaceFilters) {
  return useQuery({
    queryKey: ['places', filters],
    queryFn: async (): Promise<{ data: PlacesResponse; offline: boolean }> => {
      try {
        const data = await apiRequest<PlacesResponse>(`/places${buildQuery(filters)}`);
        return { data, offline: false };
      } catch {
        // API erişilemiyorsa paketlenmiş örnek veriyle demo modunda devam et
        return { data: filterMock(filters), offline: true };
      }
    },
  });
}
