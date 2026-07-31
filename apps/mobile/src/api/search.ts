import { apiRequest } from './client';
import type { PlaceListItem } from './places';

export interface SmartMatchItem {
  place: PlaceListItem;
  matchPercentage: number;
  matchedCriteria: string[];
  missingCriteria: string[];
}

export interface SmartMatchResponse {
  total: number;
  page: number;
  pageSize: number;
  items: SmartMatchItem[];
}

export interface SavedSearch {
  id: string;
  name: string;
  searchText: string | null;
  criteria: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistoryEntry {
  id: string;
  searchText: string | null;
  criteria: string[];
  createdAt: string;
}

export const searchApi = {
  smartMatch: (body: { searchText?: string; criteria: string[] }) =>
    apiRequest<SmartMatchResponse>('/smart-match/search', { method: 'POST', body, auth: true }),
  savedSearches: () => apiRequest<SavedSearch[]>('/saved-searches', { auth: true }),
  createSavedSearch: (body: { name: string; searchText?: string; criteria: string[] }) =>
    apiRequest<SavedSearch>('/saved-searches', { method: 'POST', body, auth: true }),
  deleteSavedSearch: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/saved-searches/${id}`, { method: 'DELETE', auth: true }),
  runSavedSearch: (id: string) =>
    apiRequest<SmartMatchResponse>(`/saved-searches/${id}/run`, { method: 'POST', auth: true }),
  history: () => apiRequest<SearchHistoryEntry[]>('/saved-searches/history', { auth: true }),
};
