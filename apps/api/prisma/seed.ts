/**
 * Seed: aktiviteler, imkânlar, skor konfigürasyonu ve örnek noktalar.
 * Çalıştırma: pnpm --filter @campulator/api db:seed
 */
import { ActivityCode, PrismaClient } from '@prisma/client';

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
  },
];

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
    create: { id: 1, featuresWeight: 0.45, userRatingWeight: 0.35, atmosphereWeight: 0.2 },
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
        publicLatitude: p.lat,
        publicLongitude: p.lng,
        locationPrecision: 'EXACT',
        feeType: p.feeType,
        operatingStatus: 'OPEN',
        publicationStatus: 'PUBLISHED',
        primaryActivity: priority[0]?.code,
        photoStatus: 'PENDING',
      },
      update: {},
    });

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
  }

  // eslint-disable-next-line no-console
  console.log('Seed tamamlandı: aktiviteler, imkânlar, skor konfigürasyonu, örnek noktalar.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
