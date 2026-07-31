import React, { useEffect, useState } from 'react';
import { Marker, type MapMarkerProps } from 'react-native-maps';

/**
 * react-native-maps'te özel görünümlü marker'lar iki hatanın arasında sıkışır:
 *
 * - `tracksViewChanges` sürekli açıksa, var olan bir marker'ın alt görünümü
 *   değiştiğinde iOS marker'ı haritanın sol üst köşesine sıçratır.
 * - Baştan kapalıysa marker'ın görüntüsü alt görünüm yerleşmeden dondurulur;
 *   marker haritada boş çizilir ve ancak harita yeniden çizilince (kaydırma,
 *   yakınlaştırma) görünür hâle gelir. Cluster'a dokunup yakınlaşınca
 *   noktaların kaybolmasının sebebi buydu.
 *
 * Çözüm: marker takılı olarak doğar, ilk çizim tamamlanacak kadar kısa bir süre
 * sonra kalıcı olarak kapanır. Görünümü değişmesi gereken marker'lar (ör. seçim)
 * `key` değiştirilerek yeniden oluşturulur; böylece her biri kendi ilk çizim
 * penceresini alır ve sıçrama davranışı hiç tetiklenmez.
 */
const INITIAL_DRAW_MS = 600;

export function TrackedMarker({ children, ...props }: MapMarkerProps) {
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracking(false), INITIAL_DRAW_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker {...props} tracksViewChanges={tracking}>
      {children}
    </Marker>
  );
}
