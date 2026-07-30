/**
 * Smart Match ve gelişmiş filtre kriter kataloğu (docs/01 §7.2, §8).
 * Backend ve mobil aynı kriter kimliklerini kullanır; tüm kriterler eşit ağırlıklıdır.
 *
 * Kriter kimliği biçimi: "<grup>:<kod>" — ör. "amenity:WC", "tag:LAKESIDE".
 */

export type CriterionGroup = 'activity' | 'fee' | 'amenity' | 'tag' | 'access' | 'atmosphere';

export interface CriterionDef {
  id: string;
  group: CriterionGroup;
  code: string;
  /** i18n anahtarı (mobil/admin sözlüklerinde çözülür) */
  labelKey: string;
}

const define = (group: CriterionGroup, code: string, labelKey: string): CriterionDef => ({
  id: `${group}:${code}`,
  group,
  code,
  labelKey,
});

/** İzinler + doğa/kullanım etiketleri (Place.tags alanında saklanır) */
export const PLACE_TAG_CODES = [
  'FIRE_ALLOWED',
  'PET_FRIENDLY',
  'LAKESIDE',
  'SEASIDE',
  'FOREST',
  'MOUNTAIN',
  'FAMILY_FRIENDLY',
  'QUIET',
] as const;
export type PlaceTagCode = (typeof PLACE_TAG_CODES)[number];

export const CRITERIA_CATALOG: CriterionDef[] = [
  // Aktiviteler (mangal izni = BARBECUE, karavan erişimi = CARAVAN aktivitesi)
  define('activity', 'CARAVAN', 'activity.caravan'),
  define('activity', 'TENT', 'activity.tent'),
  define('activity', 'PICNIC', 'activity.picnic'),
  define('activity', 'BARBECUE', 'activity.barbecue'),
  // Ücret
  define('fee', 'FREE', 'criteria.fee.free'),
  // İmkânlar
  define('amenity', 'WC', 'amenity.wc'),
  define('amenity', 'SHOWER', 'amenity.shower'),
  define('amenity', 'DRINKING_WATER', 'amenity.drinkingWater'),
  define('amenity', 'ELECTRICITY', 'amenity.electricity'),
  define('amenity', 'MARKET', 'amenity.market'),
  define('amenity', 'TABLE', 'amenity.table'),
  define('amenity', 'TRASH_BIN', 'amenity.trashBin'),
  define('amenity', 'WIFI', 'amenity.wifi'),
  define('amenity', 'PARKING', 'amenity.parking'),
  define('amenity', 'LIGHTING', 'amenity.lighting'),
  define('amenity', 'ACCESSIBLE', 'amenity.accessible'),
  define('amenity', 'RV_HOOKUP', 'amenity.rvHookup'),
  define('amenity', 'GRAY_WATER', 'amenity.grayWater'),
  // İzinler + doğa
  define('tag', 'FIRE_ALLOWED', 'criteria.tag.fireAllowed'),
  define('tag', 'PET_FRIENDLY', 'criteria.tag.petFriendly'),
  define('tag', 'LAKESIDE', 'criteria.tag.lakeside'),
  define('tag', 'SEASIDE', 'criteria.tag.seaside'),
  define('tag', 'FOREST', 'criteria.tag.forest'),
  define('tag', 'MOUNTAIN', 'criteria.tag.mountain'),
  define('tag', 'FAMILY_FRIENDLY', 'criteria.tag.familyFriendly'),
  define('tag', 'QUIET', 'criteria.tag.quiet'),
  // Erişim
  define('access', 'ASPHALT', 'criteria.access.asphalt'),
  define('access', 'NORMAL_CAR', 'criteria.access.normalCar'),
  define('access', 'HIGH_CLEARANCE', 'criteria.access.highClearance'),
  define('access', 'FOUR_BY_FOUR', 'criteria.access.fourByFour'),
  // Atmosfer (sayısal metriklerden türetilen eşikler)
  define('atmosphere', 'GOOD_SIGNAL', 'criteria.atmosphere.goodSignal'),
  define('atmosphere', 'QUIET_AREA', 'criteria.atmosphere.quietArea'),
  define('atmosphere', 'LOW_CROWD', 'criteria.atmosphere.lowCrowd'),
];

export const CRITERIA_BY_ID = new Map(CRITERIA_CATALOG.map((c) => [c.id, c]));

/** Atmosfer kriterleri için eşikler (5 üzerinden) */
export const ATMOSPHERE_THRESHOLDS = {
  GOOD_SIGNAL: 3.5, // cellSignal >=
  QUIET_AREA: 3.5, // quietness >=
  LOW_CROWD: 2.5, // crowdLevel <=
} as const;
