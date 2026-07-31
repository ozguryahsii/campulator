import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import MapView, { Circle, Region } from 'react-native-maps';
import type { RootStackParamList, RootTabParamList } from '../navigation/RootNavigator';
import type { ActivityCode, PlaceFilters, PlaceListItem } from '../api/places';
import { usePlaces } from '../api/places';
import { FiltersModal } from '../components/FiltersModal';
import { PlaceCard } from '../components/PlaceCard';
import { clusterPlaces, type Cluster } from '../features/explore/clustering';
import { TrackedMarker } from '../features/explore/TrackedMarker';
import { darkMapStyle } from '../features/explore/mapStyle';
import { ACTIVITY_ICONS, ClusterMarkerView, PlaceMarkerView } from '../features/explore/markers';
import { useTheme } from '../theme/tokens';

const INITIAL_REGION: Region = {
  latitude: 39.0,
  longitude: 32.0,
  latitudeDelta: 12,
  longitudeDelta: 14,
};

const CARD_WIDTH = Dimensions.get('window').width - 64;

const ACTIVITY_CHIPS: ActivityCode[] = ['CARAVAN', 'TENT', 'PICNIC', 'BARBECUE'];

export function ExploreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const cardListRef = useRef<FlatList<PlaceListItem>>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootTabParamList, 'Explore'>>();

  const openDetail = (place: PlaceListItem) =>
    navigation.navigate('PlaceDetail', { placeId: place.id, fallback: place });

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityCode[]>([]);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [listMode, setListMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState<PlaceFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  /**
   * Programatik harita hareketlerinden sonra marker'ları yeniden oluşturmak için
   * artan damga. react-native-maps iOS'ta hareket sırasında oluşan marker'ların
   * görüntüsünü boş donduruyor; harita durduktan sonra yeniden oluşturulan
   * marker doğru çiziliyor. Kullanıcının haritayı hafifçe oynatınca noktaların
   * belirmesinin sebebi buydu — o dokunuşu artık uygulama kendi yapıyor.
   */
  const [redrawEpoch, setRedrawEpoch] = useState(0);
  const redrawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRedraw = useCallback((delayMs = 500) => {
    if (redrawTimer.current) clearTimeout(redrawTimer.current);
    redrawTimer.current = setTimeout(() => setRedrawEpoch((value) => value + 1), delayMs);
  }, []);

  useEffect(() => () => {
    if (redrawTimer.current) clearTimeout(redrawTimer.current);
  }, []);

  const activeFilters: PlaceFilters = {
    ...advanced,
    search: submittedSearch || undefined,
    feeType: freeOnly ? 'FREE' : advanced.feeType,
    activities: activityFilter.length ? activityFilter : advanced.activities,
  };
  const { data: result, isLoading } = usePlaces(activeFilters);
  const advancedCount =
    (advanced.amenities?.length ?? 0) +
    (advanced.tags?.length ?? 0) +
    (advanced.minRating ? 1 : 0) +
    (advanced.includePermanentlyClosed ? 1 : 0) +
    (advanced.feeType ? 1 : 0) +
    (advanced.activities?.length ?? 0);

  const places = useMemo(() => result?.data.items ?? [], [result]);
  const points = useMemo(
    () => clusterPlaces(places, region.longitudeDelta),
    [places, region.longitudeDelta],
  );

  const focusPlace = useCallback(
    (place: PlaceListItem, animateMap = true) => {
      setSelectedId(place.id);
      if (animateMap) {
        mapRef.current?.animateToRegion(
          {
            latitude: place.latitude,
            longitude: place.longitude,
            latitudeDelta: Math.min(region.latitudeDelta, 0.6),
            longitudeDelta: Math.min(region.longitudeDelta, 0.7),
          },
          400,
        );
      }
      const index = places.findIndex((p) => p.id === place.id);
      if (index >= 0) {
        cardListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }
    },
    [places, region],
  );

  /**
   * Cluster'a dokununca sabit oranda yakınlaşmak yeterli değil: yoğun bir küme
   * bir kademe yakınlaşmada hâlâ tek hücrede kalabiliyor ve "13" rozeti gene
   * karşımıza çıkıyordu. Bunun yerine kümedeki tüm noktaları çerçeveye alıyoruz,
   * böylece hepsi tek dokunuşta ayrışıyor.
   */
  const expandCluster = useCallback(
    (cluster: Cluster) => {
      mapRef.current?.fitToCoordinates(
        cluster.places.map((place) => ({ latitude: place.latitude, longitude: place.longitude })),
        { edgePadding: { top: 140, right: 80, bottom: 260, left: 80 }, animated: true },
      );
      scheduleRedraw();
    },
    [scheduleRedraw],
  );

  /**
   * Nokta detayındaki "Haritada gör" ile gelindiğinde o noktaya odaklanılır.
   * Nokta listede yoksa (filtre dışı kalmışsa) koordinatına gidilir.
   */
  const focusParam = route.params?.focusPlaceId;
  useEffect(() => {
    if (!focusParam) return;
    setListMode(false);
    setSelectedId(focusParam);

    const target = places.find((place) => place.id === focusParam);
    const latitude = target?.latitude ?? route.params?.latitude;
    const longitude = target?.longitude ?? route.params?.longitude;
    if (latitude === undefined || longitude === undefined) return;

    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 },
      500,
    );
    scheduleRedraw(700);
    // Parametre tüketildi; sekmeye tekrar dönünce yeniden odaklanmasın
    navigation.setParams({ focusPlaceId: undefined } as never);
  }, [focusParam, places, route.params, scheduleRedraw, navigation]);

  const toggleActivity = (code: ActivityCode) => {
    setActivityFilter((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  };

  const goToMyLocation = async () => {
    // Konum izni yalnızca kullanıcı isteyince sorulur (docs/01 §6)
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const position = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion(
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.6,
      },
      500,
    );
  };

  const chipStyle = (active: boolean) => [
    styles.chip,
    {
      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
      borderColor: active ? theme.colors.primary : theme.colors.border,
    },
  ];
  const chipTextStyle = (active: boolean) => ({
    color: active ? theme.colors.background : theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Üst arama + filtre çubuğu */}
      <View style={styles.topBar}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder={t('explore.searchHint')}
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setSubmittedSearch(search)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              hitSlop={8}
              onPress={() => {
                setSearch('');
                setSubmittedSearch('');
              }}
            >
              <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.chipsRow}>
          <Pressable
            style={chipStyle(advancedCount > 0)}
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('explore.filters')}
          >
            <Ionicons
              name="options"
              size={13}
              color={advancedCount > 0 ? theme.colors.background : theme.colors.textSecondary}
            />
            <Text style={chipTextStyle(advancedCount > 0)}>
              {t('explore.filters')}
              {advancedCount > 0 ? ` (${advancedCount})` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={chipStyle(freeOnly)}
            onPress={() => setFreeOnly(!freeOnly)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: freeOnly }}
            accessibilityLabel={t('explore.free')}
          >
            <Text style={chipTextStyle(freeOnly)}>₺0 {t('explore.free')}</Text>
          </Pressable>
          {ACTIVITY_CHIPS.map((code) => {
            const active = activityFilter.includes(code);
            return (
              <Pressable
                key={code}
                style={chipStyle(active)}
                onPress={() => toggleActivity(code)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={t(`activity.${code.toLowerCase()}`)}
              >
                <MaterialCommunityIcons
                  name={ACTIVITY_ICONS[code]}
                  size={13}
                  color={active ? theme.colors.background : theme.colors.textSecondary}
                />
                <Text style={chipTextStyle(active)}>{t(`activity.${code.toLowerCase()}`)}</Text>
              </Pressable>
            );
          })}
          <Pressable
            style={chipStyle(listMode)}
            onPress={() => setListMode(!listMode)}
            accessibilityRole="button"
            accessibilityLabel={listMode ? t('explore.mapView') : t('explore.listView')}
          >
            <Ionicons
              name={listMode ? 'map' : 'list'}
              size={13}
              color={listMode ? theme.colors.background : theme.colors.textSecondary}
            />
            <Text style={chipTextStyle(listMode)}>
              {listMode ? t('explore.mapView') : t('explore.listView')}
            </Text>
          </Pressable>
        </View>

        {result?.offline && (
          <Text style={[styles.offline, { color: theme.colors.warning }]}>
            {t('explore.offline')}
          </Text>
        )}
      </View>

      {listMode ? (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
              {isLoading ? t('common.loading') : t('explore.empty')}
            </Text>
          }
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              selected={item.id === selectedId}
              onPress={() => openDetail(item)}
            />
          )}
        />
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={INITIAL_REGION}
            customMapStyle={darkMapStyle}
            onRegionChangeComplete={setRegion}
            toolbarEnabled={false}
          >
            {points.map((point) =>
              point.type === 'cluster' ? (
                <TrackedMarker
                  key={`${point.cluster.id}-${redrawEpoch}`}
                  coordinate={{
                    latitude: point.cluster.latitude,
                    longitude: point.cluster.longitude,
                  }}
                  onPress={() => expandCluster(point.cluster)}
                >
                  <ClusterMarkerView count={point.cluster.places.length} />
                </TrackedMarker>
              ) : (
                <TrackedMarker
                  /*
                   * Anahtara seçim durumu dahil: seçim değişince marker yerinde
                   * güncellenmek yerine yeniden oluşturulur (bkz. TrackedMarker).
                   */
                  key={`${point.place.id}-${point.place.id === selectedId ? 'sel' : 'idle'}-${redrawEpoch}`}
                  coordinate={{
                    latitude: point.place.latitude,
                    longitude: point.place.longitude,
                  }}
                  zIndex={point.place.id === selectedId ? 2 : 1}
                  onPress={() => focusPlace(point.place, false)}
                >
                  <PlaceMarkerView
                    primaryActivity={point.place.primaryActivity}
                    extraCount={Math.max(0, point.place.activities.length - 1)}
                    dimmed={point.place.operatingStatus !== 'OPEN'}
                    selected={point.place.id === selectedId}
                  />
                </TrackedMarker>
              ),
            )}
            {/* Yaklaşık konumlu seçili nokta için 500 m gösterim dairesi */}
            {places
              .filter((p) => p.id === selectedId && p.locationPrecision === 'APPROXIMATE')
              .map((p) => (
                <Circle
                  key={`circle-${p.id}`}
                  center={{ latitude: p.latitude, longitude: p.longitude }}
                  radius={p.approximateRadiusMeters ?? 500}
                  strokeColor="rgba(120,192,67,0.8)"
                  fillColor="rgba(120,192,67,0.15)"
                />
              ))}
          </MapView>

          <Pressable
            style={[
              styles.locationButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => void goToMyLocation()}
            accessibilityRole="button"
            accessibilityLabel={t('explore.myLocation')}
          >
            <Ionicons name="locate" size={20} color={theme.colors.primary} />
          </Pressable>

          {/* Alt yatay kart listesi (marker senkronlu) */}
          <View style={styles.cards}>
            <Text style={[styles.cardsTitle, { color: theme.colors.textPrimary }]}>
              {t('explore.nearby')} · {t('explore.resultCount', { count: places.length })}
            </Text>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
            ) : (
              <FlatList
                ref={cardListRef}
                data={places}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 24 }}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                getItemLayout={(_, index) => ({
                  length: CARD_WIDTH + 12,
                  offset: (CARD_WIDTH + 12) * index,
                  index,
                })}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
                  const place = places[index];
                  if (place && place.id !== selectedId) focusPlace(place);
                }}
                renderItem={({ item }) => (
                  <PlaceCard
                    place={item}
                    width={CARD_WIDTH}
                    selected={item.id === selectedId}
                    onPress={() => (item.id === selectedId ? openDetail(item) : focusPlace(item))}
                  />
                )}
              />
            )}
          </View>
        </>
      )}

      <FiltersModal
        visible={filtersOpen}
        initial={activeFilters}
        onClose={() => setFiltersOpen(false)}
        onApply={(filters) => {
          setAdvanced(filters);
          setFreeOnly(false);
          setActivityFilter([]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, zIndex: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  offline: { fontSize: 11, marginTop: 6 },
  map: { flex: 1 },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 190,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cards: { position: 'absolute', left: 0, right: 0, bottom: 12 },
  cardsTitle: { fontSize: 13, fontWeight: '700', marginLeft: 24, marginBottom: 8 },
  listContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
});
