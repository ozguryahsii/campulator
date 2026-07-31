import { blurCoordinates } from '../places/location-privacy';

const REAL_LAT = 39.7071;
const REAL_LNG = 26.8734;
const PLACE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** Metre cinsinden kuş uçuşu mesafe */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

describe('Konum gizliliği (docs/01 §12, docs/02 §7)', () => {
  it('gerçek koordinatı değiştirir (gizler)', () => {
    const blurred = blurCoordinates(PLACE_ID, REAL_LAT, REAL_LNG, 500);
    expect(blurred.latitude).not.toBe(REAL_LAT);
    expect(blurred.longitude).not.toBe(REAL_LNG);
  });

  it('bulanık merkez 500 m yarıçap içinde kalır', () => {
    const blurred = blurCoordinates(PLACE_ID, REAL_LAT, REAL_LNG, 500);
    const distance = distanceMeters(REAL_LAT, REAL_LNG, blurred.latitude, blurred.longitude);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(500);
  });

  it('deterministiktir: aynı nokta her çağrıda aynı merkezi verir', () => {
    const first = blurCoordinates(PLACE_ID, REAL_LAT, REAL_LNG, 500);
    const second = blurCoordinates(PLACE_ID, REAL_LAT, REAL_LNG, 500);
    expect(first).toEqual(second);
  });

  it('farklı noktalar farklı yönlere kaydırılır', () => {
    const a = blurCoordinates('11111111-1111-1111-1111-111111111111', REAL_LAT, REAL_LNG, 500);
    const b = blurCoordinates('22222222-2222-2222-2222-222222222222', REAL_LAT, REAL_LNG, 500);
    expect(a).not.toEqual(b);
  });
});
