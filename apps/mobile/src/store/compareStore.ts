import { create } from 'zustand';
import type { PlaceListItem } from '../api/places';

/** Karşılaştırma seçimi: en fazla 3 nokta (docs/01 §19) */
interface CompareState {
  places: PlaceListItem[];
  toggle: (place: PlaceListItem) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  places: [],
  toggle: (place) => {
    const current = get().places;
    if (current.some((p) => p.id === place.id)) {
      set({ places: current.filter((p) => p.id !== place.id) });
    } else if (current.length < 3) {
      set({ places: [...current, place] });
    }
  },
  clear: () => set({ places: [] }),
}));
