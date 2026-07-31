import type { PlaceListItem } from '../../api/places';

export interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  places: PlaceListItem[];
}

export type MapPoint =
  { type: 'place'; place: PlaceListItem } | { type: 'cluster'; cluster: Cluster };

/**
 * Basit grid tabanlı kümeleme: görünür bölge ~8 hücreye bölünür, aynı hücreye
 * düşen noktalar tek cluster'da toplanır. Harita kütüphanesinden bağımsızdır.
 */
export function clusterPlaces(places: PlaceListItem[], longitudeDelta: number): MapPoint[] {
  const cellSize = longitudeDelta / 8;
  if (cellSize <= 0) return places.map((place) => ({ type: 'place', place }));

  const cells = new Map<string, PlaceListItem[]>();
  for (const place of places) {
    const key = `${Math.floor(place.latitude / cellSize)}:${Math.floor(
      place.longitude / cellSize,
    )}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(place);
    else cells.set(key, [place]);
  }

  const points: MapPoint[] = [];
  for (const [key, bucket] of cells) {
    if (bucket.length === 1) {
      points.push({ type: 'place', place: bucket[0] });
    } else {
      points.push({
        type: 'cluster',
        cluster: {
          id: `cluster-${key}`,
          latitude: bucket.reduce((sum, p) => sum + p.latitude, 0) / bucket.length,
          longitude: bucket.reduce((sum, p) => sum + p.longitude, 0) / bucket.length,
          places: bucket,
        },
      });
    }
  }
  return points;
}
