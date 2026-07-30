/** Google Maps koyu tema stili — Campulator lacivert/yeşil paletiyle uyumlu. */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0e1b2b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a7b3c2' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08131f' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#12291c' }] },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#78c043' }, { visibility: 'on' }],
  },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#122338' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8c' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1c3450' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#081420' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a5570' }] },
];
