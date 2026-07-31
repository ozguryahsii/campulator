import { apiRequest } from './client';
import type { ActivityCode } from './places';

export interface CollectionItem {
  placeId: string;
  sortOrder: number;
  place: {
    id: string;
    name: string;
    city: string | null;
    feeType: string;
    operatingStatus: string;
    score: { overall: number } | null;
    activities: ActivityCode[];
  };
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  items: CollectionItem[];
}

export const collectionsApi = {
  list: () => apiRequest<Collection[]>('/collections', { auth: true }),
  create: (name: string) =>
    apiRequest<{ id: string; name: string }>('/collections', {
      method: 'POST',
      body: { name },
      auth: true,
    }),
  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/collections/${id}`, { method: 'DELETE', auth: true }),
  addItem: (id: string, placeId: string) =>
    apiRequest<{ added: boolean }>(`/collections/${id}/items`, {
      method: 'POST',
      body: { placeId },
      auth: true,
    }),
  removeItem: (id: string, placeId: string) =>
    apiRequest<{ removed: boolean }>(`/collections/${id}/items/${placeId}`, {
      method: 'DELETE',
      auth: true,
    }),
  reorder: (id: string, placeIds: string[]) =>
    apiRequest<{ reordered: boolean }>(`/collections/${id}/reorder`, {
      method: 'PATCH',
      body: { placeIds },
      auth: true,
    }),
};
