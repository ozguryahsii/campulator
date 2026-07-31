/**
 * Campulator Global JSONL Pipeline çıktısını (OpenStreetMap kaynaklı) iç veri
 * modelimize çevirir. Saf fonksiyonlardır; veritabanı gerektirmez.
 *
 * Kaynak şema: campulator-global-pipeline/docs/schema-example.json
 */

export interface PipelinePlace {
  schema_version?: string;
  external_id: string;
  name: string | null;
  coordinates: { latitude: number; longitude: number };
  activity_types: string[];
  fee_type: 'FREE' | 'PAID' | 'UNKNOWN';
  amenities: Record<string, boolean | null>;
  contact?: Record<string, string | null>;
  opening_hours?: string | null;
  operating_status?: string;
  source_tags?: Record<string, string>;
  source_url: string;
  attribution?: string;
  photo_refs?: string[];
  completeness_score: number;
  requires_review?: boolean;
}

export interface PipelinePhoto {
  place_external_id: string;
  provider: string;
  source_page_url: string;
  original_url: string;
  thumbnail_url?: string | null;
  title?: string | null;
  author?: string | null;
  license?: string | null;
  license_url?: string | null;
  attribution_text: string;
  distance_meters?: number | null;
  confidence: number;
  is_primary_candidate?: boolean;
  requires_review?: boolean;
}

export type ActivityCode = 'CARAVAN' | 'TENT' | 'PICNIC' | 'BARBECUE';

const ACTIVITY_CODES: ActivityCode[] = ['CARAVAN', 'TENT', 'PICNIC', 'BARBECUE'];

/** Pipeline imkân anahtarı → Campulator imkân kodu */
const AMENITY_MAP: Record<string, string> = {
  toilets: 'WC',
  shower: 'SHOWER',
  drinking_water: 'DRINKING_WATER',
  electricity: 'ELECTRICITY',
  wifi: 'WIFI',
  market: 'MARKET',
  waste_disposal: 'TRASH_BIN',
  sanitary_dump_station: 'GRAY_WATER',
  picnic_table: 'TABLE',
  parking: 'PARKING',
  lighting: 'LIGHTING',
  wheelchair_accessible: 'ACCESSIBLE',
};

/**
 * Pipeline'ın imkân sözlüğünde karşılığı olmayan, yalnızca ham OSM
 * etiketlerinden çıkarılabilen imkânlar.
 */
const AMENITY_TAG_RULES: { code: string; matches: (tags: Record<string, string>) => boolean }[] = [
  {
    // Karavan sahasında elektrik bağlantısı = RV hookup
    code: 'RV_HOOKUP',
    matches: (t) => t.tourism === 'caravan_site' && (isYes(t.electricity) || Boolean(t.power_supply)),
  },
];

/** OSM etiketlerinden çıkarılabilen doğa/izin etiketleri (docs/01 §8) */
const TAG_RULES: { code: string; matches: (tags: Record<string, string>) => boolean }[] = [
  { code: 'PET_FRIENDLY', matches: (t) => isYes(t.dog) || isYes(t.dogs) || isYes(t.pets) },
  { code: 'FIRE_ALLOWED', matches: (t) => isYes(t.openfire) || isYes(t.fireplace) },
  { code: 'FOREST', matches: (t) => t.natural === 'wood' || t.landuse === 'forest' },
  { code: 'SEASIDE', matches: (t) => isYes(t.beach) || t['natural'] === 'beach' },
  { code: 'LAKESIDE', matches: (t) => t.water === 'lake' || isYes(t.lake) },
  {
    code: 'FAMILY_FRIENDLY',
    matches: (t) => isYes(t.playground) || t['camp_site'] === 'family',
  },
  // 1200 m üzeri rakım veya dağlık arazi
  {
    code: 'MOUNTAIN',
    matches: (t) =>
      t.natural === 'peak' ||
      t.natural === 'ridge' ||
      (Number.isFinite(Number(t.ele)) && Number(t.ele) >= 1200),
  },
  { code: 'QUIET', matches: (t) => t.noise === 'no' || t['camp_site'] === 'quiet' },
];

function isYes(value: string | undefined): boolean {
  return value === 'yes' || value === 'designated' || value === 'true';
}

/** Yalnızca tanıdığımız aktivite kodları; boşsa TENT varsayılır (kamp alanı) */
export function mapActivities(activityTypes: string[]): ActivityCode[] {
  const mapped = activityTypes.filter((code): code is ActivityCode =>
    ACTIVITY_CODES.includes(code as ActivityCode),
  );
  return mapped.length > 0 ? mapped : ['TENT'];
}

/** true olan imkânlar alınır; null (bilinmiyor) ve false yok sayılır */
export function mapAmenities(
  amenities: Record<string, boolean | null>,
  sourceTags: Record<string, string> = {},
): string[] {
  const fromDict = Object.entries(amenities)
    .filter(([key, value]) => value === true && AMENITY_MAP[key])
    .map(([key]) => AMENITY_MAP[key]);
  const fromTags = AMENITY_TAG_RULES.filter((rule) => rule.matches(sourceTags)).map((r) => r.code);
  return [...new Set([...fromDict, ...fromTags])];
}

/** OSM ham etiketlerinden doğa/izin etiketleri çıkarır */
export function mapTags(sourceTags: Record<string, string> | undefined): string[] {
  if (!sourceTags) return [];
  return TAG_RULES.filter((rule) => rule.matches(sourceTags)).map((rule) => rule.code);
}

/**
 * Ad üretimi: pipeline adı olmayan kayıtlar da gönderebiliyor. Adsız kayıt
 * kullanıcıya gösterilemeyeceği için içe aktarımda atlanır.
 */
export function isImportable(place: PipelinePlace): boolean {
  if (!place.name || place.name.trim().length < 2) return false;
  const { latitude, longitude } = place.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/** OSM `addr:*` etiketlerinden ülke/bölge/şehir çıkarır */
export function mapAddress(sourceTags: Record<string, string> | undefined): {
  countryCode: string | null;
  region: string | null;
  city: string | null;
} {
  const t = sourceTags ?? {};
  const country = t['addr:country'];
  return {
    countryCode: country && country.length === 2 ? country.toUpperCase() : null,
    region: t['addr:province'] ?? t['addr:state'] ?? t['addr:region'] ?? null,
    city: t['addr:city'] ?? t['addr:town'] ?? t['addr:village'] ?? null,
  };
}

/** OSM açıklama etiketleri; tek satırlık serbest metin */
export function mapDescription(sourceTags: Record<string, string> | undefined): string | null {
  const t = sourceTags ?? {};
  const text = t.description ?? t['description:tr'] ?? t['description:en'] ?? null;
  return text ? text.trim().slice(0, 1000) : null;
}

/** Türkçe karakterleri koruyarak URL uyumlu slug üretir */
export function slugify(name: string, externalId: string): string {
  const base = name
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  // Kimlik son eki: aynı adlı noktalar çakışmasın
  const suffix = externalId.replace(/[^a-z0-9]+/gi, '').slice(-8).toLowerCase();
  return base ? `${base}-${suffix}` : `nokta-${suffix}`;
}

/**
 * İçe aktarılan noktanın yayın durumu. Pipeline `requires_review` işaretlediyse
 * veya veri fakirse moderasyon kuyruğuna düşer (docs/01 §14).
 */
export function publicationStatus(place: PipelinePlace): 'PUBLISHED' | 'PENDING_REVIEW' {
  if (place.requires_review) return 'PENDING_REVIEW';
  return place.completeness_score >= 45 ? 'PUBLISHED' : 'PENDING_REVIEW';
}

/**
 * Tekrar içe aktarımda geçerli yayın durumu. Moderatör kararı kaynağın
 * önündedir: yayımlanmış ya da reddedilmiş bir nokta kuyruğa geri düşmez.
 */
export function effectivePublicationStatus(
  existingStatus: string | null | undefined,
  sourceStatus: 'PUBLISHED' | 'PENDING_REVIEW',
): string {
  if (existingStatus && existingStatus !== 'PENDING_REVIEW') return existingStatus;
  return sourceStatus;
}

export function mapFeeType(feeType: string | undefined): 'FREE' | 'PAID' | 'UNKNOWN' {
  return feeType === 'FREE' || feeType === 'PAID' ? feeType : 'UNKNOWN';
}

/** Marker önceliği: Karavan > Çadır > Piknik > Mangal (docs/01 §9) */
export function primaryActivity(activities: ActivityCode[]): ActivityCode {
  const order: ActivityCode[] = ['CARAVAN', 'TENT', 'PICNIC', 'BARBECUE'];
  return order.find((code) => activities.includes(code)) ?? 'TENT';
}

/**
 * Fotoğraf adayı doğrudan yayınlanabilir mi? Pipeline'ın güven skoru saf
 * mesafedir (`1 - mesafe / arama yarıçapı`), yani 750 m yarıçapta 0.8 eşiği
 * fotoğrafın 150 m içinde olmasını ister — gerçek veride neredeyse hiçbir aday
 * bunu tutturmaz. Varsayılan 0.6 (≈300 m); geri kalanı admin panelindeki
 * fotoğraf onayı ekranına düşer.
 */
export const DEFAULT_PHOTO_MIN_CONFIDENCE = 0.6;

export function photoStatus(
  photo: PipelinePhoto,
  minConfidence: number = DEFAULT_PHOTO_MIN_CONFIDENCE,
): 'PUBLISHED' | 'PENDING' {
  return photo.is_primary_candidate && photo.confidence >= minConfidence ? 'PUBLISHED' : 'PENDING';
}
