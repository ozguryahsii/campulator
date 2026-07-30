/**
 * Seed: aktiviteler, imkânlar, skor konfigürasyonu ve örnek noktalar.
 * Çalıştırma: pnpm --filter @campulator/api db:seed
 */
import { ActivityCode, OperatingStatus, PrismaClient } from '@prisma/client';
import { blurCoordinates } from '../src/places/location-privacy';

const prisma = new PrismaClient();

// Bitmask: CARAVAN=1, TENT=2, PICNIC=4, BARBECUE=8
const ALL = 15;
const CAMP = 3; // karavan + çadır

const ACTIVITIES: { code: ActivityCode; nameKey: string; markerPriority: number }[] = [
  { code: 'CARAVAN', nameKey: 'activity.caravan', markerPriority: 1 },
  { code: 'TENT', nameKey: 'activity.tent', markerPriority: 2 },
  { code: 'PICNIC', nameKey: 'activity.picnic', markerPriority: 3 },
  { code: 'BARBECUE', nameKey: 'activity.barbecue', markerPriority: 4 },
];

const AMENITIES: { code: string; nameKey: string; weight: number; mask: number }[] = [
  { code: 'WC', nameKey: 'amenity.wc', weight: 1.5, mask: ALL },
  { code: 'SHOWER', nameKey: 'amenity.shower', weight: 1.2, mask: CAMP },
  { code: 'DRINKING_WATER', nameKey: 'amenity.drinkingWater', weight: 1.5, mask: ALL },
  { code: 'ELECTRICITY', nameKey: 'amenity.electricity', weight: 1.2, mask: CAMP },
  { code: 'MARKET', nameKey: 'amenity.market', weight: 1, mask: ALL },
  { code: 'TABLE', nameKey: 'amenity.table', weight: 0.8, mask: ALL },
  { code: 'TRASH_BIN', nameKey: 'amenity.trashBin', weight: 0.8, mask: ALL },
  { code: 'WIFI', nameKey: 'amenity.wifi', weight: 0.6, mask: CAMP },
  { code: 'PARKING', nameKey: 'amenity.parking', weight: 1, mask: ALL },
  { code: 'LIGHTING', nameKey: 'amenity.lighting', weight: 0.8, mask: ALL },
  { code: 'ACCESSIBLE', nameKey: 'amenity.accessible', weight: 0.8, mask: ALL },
  { code: 'RV_HOOKUP', nameKey: 'amenity.rvHookup', weight: 1.2, mask: 1 },
  { code: 'GRAY_WATER', nameKey: 'amenity.grayWater', weight: 1, mask: 1 },
];

interface SamplePlace {
  name: string;
  slug: string;
  description: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  feeType: 'FREE' | 'PAID';
  activities: ActivityCode[];
  amenities: string[];
  precision?: 'EXACT' | 'APPROXIMATE';
  status?: OperatingStatus;
  seasonal?: [number, number];
  score?: { features: number; user: number; atmosphere: number };
}

const SAMPLE_PLACES: SamplePlace[] = [
  {
    name: 'Çıralı Sahil Kamp Alanı',
    slug: 'cirali-sahil-kamp-alani',
    description: 'Deniz kenarında, çadır ve karavana uygun, ağaçlık gölgeli kamp alanı.',
    city: 'Antalya',
    region: 'Akdeniz',
    lat: 36.4139,
    lng: 30.4762,
    feeType: 'PAID',
    activities: ['TENT', 'CARAVAN', 'BARBECUE'],
    amenities: ['WC', 'SHOWER', 'DRINKING_WATER', 'ELECTRICITY', 'MARKET', 'TRASH_BIN'],
    score: { features: 4.4, user: 4.6, atmosphere: 4.1 },
  },
  {
    name: 'Abant Gölü Piknik Alanı',
    slug: 'abant-golu-piknik-alani',
    description: 'Göl manzaralı, masalı ve mangal izinli günübirlik piknik alanı.',
    city: 'Bolu',
    region: 'Karadeniz',
    lat: 40.6068,
    lng: 31.2792,
    feeType: 'PAID',
    activities: ['PICNIC', 'BARBECUE'],
    amenities: ['WC', 'DRINKING_WATER', 'TABLE', 'TRASH_BIN', 'PARKING'],
    score: { features: 4.0, user: 4.2, atmosphere: 3.6 },
  },
  {
    name: 'Kazdağı Orman Kampı',
    slug: 'kazdagi-orman-kampi',
    description: 'Orman içinde sessiz, doğal ve ücretsiz çadır kampı noktası.',
    city: 'Balıkesir',
    region: 'Marmara',
    lat: 39.7071,
    lng: 26.8734,
    feeType: 'FREE',
    activities: ['TENT'],
    amenities: ['DRINKING_WATER'],
    precision: 'APPROXIMATE',
    score: { features: 2.8, user: 4.8, atmosphere: 4.7 },
  },
  {
    name: 'Salda Gölü Kamp Noktası',
    slug: 'salda-golu-kamp-noktasi',
    description: 'Beyaz kumsallı göl kenarında karavan ve çadır alanı.',
    city: 'Burdur',
    region: 'Akdeniz',
    lat: 37.5417,
    lng: 29.6708,
    feeType: 'FREE',
    activities: ['CARAVAN', 'TENT', 'PICNIC'],
    amenities: ['WC', 'PARKING', 'TRASH_BIN'],
    score: { features: 3.4, user: 4.5, atmosphere: 4.3 },
  },
  {
    name: 'Uzungöl Karavan Parkı',
    slug: 'uzungol-karavan-parki',
    description: 'Göl kıyısında elektrik ve gri su boşaltma imkânlı karavan parkı.',
    city: 'Trabzon',
    region: 'Karadeniz',
    lat: 40.6193,
    lng: 40.2946,
    feeType: 'PAID',
    activities: ['CARAVAN'],
    amenities: ['WC', 'SHOWER', 'ELECTRICITY', 'RV_HOOKUP', 'GRAY_WATER', 'MARKET'],
    score: { features: 4.7, user: 4.0, atmosphere: 3.2 },
  },
  {
    name: 'Kapadokya Vadi Kampı',
    slug: 'kapadokya-vadi-kampi',
    description: 'Peri bacaları manzaralı, mevsimlik açık çadır ve karavan alanı.',
    city: 'Nevşehir',
    region: 'İç Anadolu',
    lat: 38.6431,
    lng: 34.8289,
    feeType: 'PAID',
    activities: ['TENT', 'CARAVAN', 'BARBECUE'],
    amenities: ['WC', 'SHOWER', 'DRINKING_WATER', 'ELECTRICITY', 'WIFI'],
    status: 'SEASONAL',
    seasonal: [4, 10],
    score: { features: 4.3, user: 4.4, atmosphere: 3.9 },
  },
  {
    name: 'Belgrad Ormanı Piknik Sahası',
    slug: 'belgrad-ormani-piknik-sahasi',
    description: 'Şehre yakın, gölgelik piknik ve mangal sahası. Bakım nedeniyle geçici kapalı.',
    city: 'İstanbul',
    region: 'Marmara',
    lat: 41.1839,
    lng: 28.9852,
    feeType: 'FREE',
    activities: ['PICNIC', 'BARBECUE'],
    amenities: ['WC', 'TABLE', 'TRASH_BIN', 'PARKING', 'DRINKING_WATER'],
    status: 'TEMPORARILY_CLOSED',
    score: { features: 3.8, user: 3.9, atmosphere: 2.9 },
  },
  {
    name: 'Eski Göl Kenarı Tesisi',
    slug: 'eski-gol-kenari-tesisi',
    description: 'İşletme kapanmıştır; alan kamp için kullanılamıyor.',
    city: 'Sakarya',
    region: 'Marmara',
    lat: 40.7126,
    lng: 30.4358,
    feeType: 'PAID',
    activities: ['TENT', 'PICNIC'],
    amenities: [],
    status: 'PERMANENTLY_CLOSED',
    score: { features: 1.8, user: 2.4, atmosphere: 2.0 },
  },
];

const CAMPSCORE_WEIGHTS = { features: 0.45, user: 0.35, atmosphere: 0.2 };

async function main() {
  for (const a of ACTIVITIES) {
    await prisma.activity.upsert({
      where: { code: a.code },
      create: { code: a.code, nameKey: a.nameKey, markerPriority: a.markerPriority },
      update: { nameKey: a.nameKey, markerPriority: a.markerPriority },
    });
  }

  for (const am of AMENITIES) {
    await prisma.amenity.upsert({
      where: { code: am.code },
      create: {
        code: am.code,
        nameKey: am.nameKey,
        weight: am.weight,
        applicableActivityMask: am.mask,
      },
      update: { nameKey: am.nameKey, weight: am.weight, applicableActivityMask: am.mask },
    });
  }

  await prisma.scoreConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      featuresWeight: CAMPSCORE_WEIGHTS.features,
      userRatingWeight: CAMPSCORE_WEIGHTS.user,
      atmosphereWeight: CAMPSCORE_WEIGHTS.atmosphere,
    },
    update: {},
  });

  const activities = await prisma.activity.findMany();
  const amenities = await prisma.amenity.findMany();
  const activityByCode = new Map(activities.map((a) => [a.code, a]));
  const amenityByCode = new Map(amenities.map((a) => [a.code, a]));

  for (const p of SAMPLE_PLACES) {
    const priority = activities
      .filter((a) => p.activities.includes(a.code))
      .sort((a, b) => a.markerPriority - b.markerPriority);
    const precision = p.precision ?? 'EXACT';

    const place = await prisma.place.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        countryCode: 'TR',
        region: p.region,
        city: p.city,
        exactLatitude: p.lat,
        exactLongitude: p.lng,
        // APPROXIMATE ise public koordinat aşağıda id ile bulanıklaştırılır
        publicLatitude: p.lat,
        publicLongitude: p.lng,
        locationPrecision: precision,
        feeType: p.feeType,
        operatingStatus: p.status ?? 'OPEN',
        seasonalOpenFrom: p.seasonal?.[0] ?? null,
        seasonalOpenTo: p.seasonal?.[1] ?? null,
        publicationStatus: 'PUBLISHED',
        primaryActivity: priority[0]?.code,
        photoStatus: 'PENDING',
      },
      update: {
        description: p.description,
        exactLatitude: p.lat,
        exactLongitude: p.lng,
        publicLatitude: p.lat,
        publicLongitude: p.lng,
        locationPrecision: precision,
        feeType: p.feeType,
        operatingStatus: p.status ?? 'OPEN',
        seasonalOpenFrom: p.seasonal?.[0] ?? null,
        seasonalOpenTo: p.seasonal?.[1] ?? null,
        primaryActivity: priority[0]?.code,
      },
    });

    if (precision === 'APPROXIMATE') {
      const blurred = blurCoordinates(place.id, p.lat, p.lng, 500);
      await prisma.place.update({
        where: { id: place.id },
        data: { publicLatitude: blurred.latitude, publicLongitude: blurred.longitude },
      });
    }

    for (const code of p.activities) {
      const activity = activityByCode.get(code);
      if (!activity) continue;
      await prisma.placeActivity.upsert({
        where: { placeId_activityId: { placeId: place.id, activityId: activity.id } },
        create: { placeId: place.id, activityId: activity.id, isAllowed: true },
        update: {},
      });
    }

    for (const code of p.amenities) {
      const amenity = amenityByCode.get(code);
      if (!amenity) continue;
      await prisma.placeAmenity.upsert({
        where: { placeId_amenityId: { placeId: place.id, amenityId: amenity.id } },
        create: { placeId: place.id, amenityId: amenity.id, value: true },
        update: {},
      });
    }

    if (p.score) {
      const overall =
        p.score.features * CAMPSCORE_WEIGHTS.features +
        p.score.user * CAMPSCORE_WEIGHTS.user +
        p.score.atmosphere * CAMPSCORE_WEIGHTS.atmosphere;
      await prisma.placeScore.upsert({
        where: { placeId: place.id },
        create: {
          placeId: place.id,
          featuresScore: p.score.features,
          userRating: p.score.user,
          atmosphereScore: p.score.atmosphere,
          overallScore: Math.round(overall * 10) / 10,
        },
        update: {
          featuresScore: p.score.features,
          userRating: p.score.user,
          atmosphereScore: p.score.atmosphere,
          overallScore: Math.round(overall * 10) / 10,
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed tamamlandı: ${SAMPLE_PLACES.length} nokta, aktiviteler, imkânlar, skor konfigürasyonu.`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
