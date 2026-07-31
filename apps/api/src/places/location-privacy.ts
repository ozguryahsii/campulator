import { createHash } from 'crypto';

/**
 * Konum gizliliği (docs/02 §7): APPROXIMATE noktalarda gerçek koordinat normal
 * istemciye dönmez; 500 m alan için bulanıklaştırılmış merkez döner.
 *
 * Bulanıklaştırma deterministiktir (seed = place id): aynı nokta her seferinde aynı
 * public merkezi alır; böylece tekrarlı isteklerle gerçek konum üçgenlenemez.
 */
export function blurCoordinates(
  placeId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number,
): { latitude: number; longitude: number } {
  const digest = createHash('sha256').update(placeId).digest();
  // 0..1 aralığında iki deterministik değer
  const u = digest.readUInt32BE(0) / 0xffffffff;
  const v = digest.readUInt32BE(4) / 0xffffffff;

  // Merkez, gerçek noktadan yarıçapın %30-70'i kadar uzakta rastgele yönde kaydırılır;
  // gerçek nokta 500 m'lik gösterim dairesinin içinde kalır.
  const distance = radiusMeters * (0.3 + 0.4 * u);
  const angle = 2 * Math.PI * v;

  const dLat = (distance * Math.cos(angle)) / 111_320;
  const dLng = (distance * Math.sin(angle)) / (111_320 * Math.cos((latitude * Math.PI) / 180));

  return {
    latitude: Number((latitude + dLat).toFixed(6)),
    longitude: Number((longitude + dLng).toFixed(6)),
  };
}
