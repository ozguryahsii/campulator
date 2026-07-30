/**
 * Campulator Global JSONL Pipeline çıktısını veritabanına aktarır.
 *
 *   pnpm --filter @campulator/api import:places -- \
 *     --places /yol/places.jsonl [--photos /yol/photos.jsonl] \
 *     [--bbox 35.8,25.6,42.2,44.9] [--limit 5000] [--dry-run]
 *
 * --bbox sırası: minLat,minLng,maxLat,maxLng (Python pipeline ile aynı).
 *
 * Aynı `external_id` ile tekrar çalıştırıldığında kayıtlar güncellenir
 * (idempotent). Kullanıcı katkısıyla eklenmiş noktalara dokunulmaz.
 */
import { ActivityCode, PlaceTagCode, PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { CampScoreService } from '../src/campscore/campscore.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import {
  isImportable,
  mapActivities,
  mapAddress,
  mapAmenities,
  mapDescription,
  mapFeeType,
  mapTags,
  photoStatus,
  primaryActivity,
  publicationStatus,
  slugify,
  type PipelinePhoto,
  type PipelinePlace,
} from '../src/import/osm-mapping';

const prisma = new PrismaClient();

interface Options {
  places?: string;
  photos?: string;
  bbox?: [number, number, number, number];
  limit?: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--places') options.places = next();
    else if (arg === '--photos') options.photos = next();
    else if (arg === '--limit') options.limit = Number(next());
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--bbox') {
      const parts = next()
        .split(',')
        .map((value) => Number(value.trim()));
      if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
        // Python pipeline ile aynı sıra kullanılır ki karışmasın
        throw new Error('--bbox biçimi: minLat,minLng,maxLat,maxLng');
      }
      options.bbox = parts as [number, number, number, number];
    }
  }
  if (!options.places) throw new Error('--places zorunlu (places.jsonl yolu)');
  return options;
}

function inBbox(place: PipelinePlace, bbox?: [number, number, number, number]): boolean {
  if (!bbox) return true;
  const [minLat, minLng, maxLat, maxLng] = bbox;
  const { latitude, longitude } = place.coordinates;
  return latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng;
}

async function* readJsonl<T>(path: string): AsyncGenerator<T> {
  const stream = createInterface({ input: createReadStream(path, 'utf-8'), crlfDelay: Infinity });
  for await (const line of stream) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    yield JSON.parse(trimmed) as T;
  }
}

async function importPlaces(options: Options) {
  const amenities = await prisma.amenity.findMany();
  const activities = await prisma.activity.findMany();
  const amenityIdByCode = new Map(amenities.map((a) => [a.code, a.id]));
  const activityIdByCode = new Map(activities.map((a) => [a.code, a.id]));

  const stats = { read: 0, skipped: 0, created: 0, updated: 0, failed: 0, outOfBbox: 0 };
  const importedIds: string[] = [];

  for await (const raw of readJsonl<PipelinePlace>(options.places!)) {
    if (options.limit && stats.created + stats.updated >= options.limit) break;
    stats.read++;

    if (!inBbox(raw, options.bbox)) {
      stats.outOfBbox++;
      continue;
    }
    if (!isImportable(raw)) {
      stats.skipped++;
      continue;
    }

    const activityCodes = mapActivities(raw.activity_types);
    const amenityCodes = mapAmenities(raw.amenities ?? {}, raw.source_tags ?? {});
    const tagCodes = mapTags(raw.source_tags);
    const status = publicationStatus(raw);
    const name = raw.name!.trim();

    if (options.dryRun) {
      stats.created++;
      continue;
    }

    try {
      const existing = await prisma.place.findUnique({ where: { externalId: raw.external_id } });
      const address = mapAddress(raw.source_tags);
      const data = {
        name,
        description: mapDescription(raw.source_tags),
        countryCode: address.countryCode,
        region: address.region,
        city: address.city,
        externalId: raw.external_id,
        dataSource: 'openstreetmap',
        sourceUrl: raw.source_url,
        attribution: raw.attribution ?? '© OpenStreetMap contributors',
        // OSM verisinde koordinat zaten kamusal; gizleme uygulanmaz
        exactLatitude: raw.coordinates.latitude,
        exactLongitude: raw.coordinates.longitude,
        publicLatitude: raw.coordinates.latitude,
        publicLongitude: raw.coordinates.longitude,
        locationPrecision: 'EXACT' as const,
        feeType: mapFeeType(raw.fee_type),
        operatingStatus: 'OPEN' as const,
        publicationStatus: status,
        primaryActivity: primaryActivity(activityCodes) as ActivityCode,
        tags: tagCodes as PlaceTagCode[],
        photoStatus: 'PENDING' as const,
      };

      const place = existing
        ? await prisma.place.update({ where: { id: existing.id }, data })
        : await prisma.place.create({
            data: { ...data, slug: slugify(name, raw.external_id) },
          });

      // Aktivite ve imkân bağlantıları her içe aktarımda kaynakla eşitlenir
      await prisma.placeActivity.deleteMany({ where: { placeId: place.id } });
      await prisma.placeActivity.createMany({
        data: activityCodes
          .map((code) => activityIdByCode.get(code as ActivityCode))
          .filter((id): id is number => id !== undefined)
          .map((activityId) => ({ placeId: place.id, activityId, isAllowed: true })),
        skipDuplicates: true,
      });

      await prisma.placeAmenity.deleteMany({ where: { placeId: place.id } });
      await prisma.placeAmenity.createMany({
        data: amenityCodes
          .map((code) => amenityIdByCode.get(code))
          .filter((id): id is number => id !== undefined)
          .map((amenityId) => ({ placeId: place.id, amenityId, value: true })),
        skipDuplicates: true,
      });

      importedIds.push(raw.external_id);
      if (existing) stats.updated++;
      else stats.created++;
    } catch (error) {
      stats.failed++;
      console.error(`  ! ${raw.external_id}: ${(error as Error).message}`);
    }

    if ((stats.created + stats.updated) % 500 === 0 && stats.created + stats.updated > 0) {
      console.log(`  ... ${stats.created + stats.updated} nokta işlendi`);
    }
  }

  return { stats, importedIds };
}

async function importPhotos(options: Options) {
  const stats = { read: 0, linked: 0, skipped: 0, failed: 0 };
  if (!options.photos) return stats;

  for await (const raw of readJsonl<PipelinePhoto>(options.photos)) {
    stats.read++;
    if (options.dryRun) continue;

    try {
      const place = await prisma.place.findUnique({
        where: { externalId: raw.place_external_id },
        select: { id: true },
      });
      if (!place) {
        stats.skipped++;
        continue;
      }

      const status = photoStatus(raw);
      await prisma.photo.upsert({
        where: { externalId: raw.original_url },
        create: {
          placeId: place.id,
          externalId: raw.original_url,
          externalUrl: raw.original_url,
          storageKey: '',
          mimeType: 'image/jpeg',
          sizeBytes: 0,
          status,
          attribution: raw.attribution_text,
          license: raw.license ?? null,
          sourceUrl: raw.source_page_url,
        },
        update: { status, attribution: raw.attribution_text, license: raw.license ?? null },
      });

      // Yayınlanan fotoğraf varsa "Fotoğraf bekleniyor" etiketi kalkar
      if (status === 'PUBLISHED') {
        await prisma.place.update({
          where: { id: place.id },
          data: { photoStatus: 'PUBLISHED' },
        });
      }
      stats.linked++;
    } catch (error) {
      stats.failed++;
      console.error(`  ! foto ${raw.place_external_id}: ${(error as Error).message}`);
    }
  }
  return stats;
}

/**
 * İçe aktarılan noktaların CampScore'u hesaplanır; aksi hâlde uygulamada
 * skorsuz görünürler.
 */
async function recalculateScores(externalIds: string[]) {
  if (externalIds.length === 0) return 0;
  const service = new CampScoreService(prisma as unknown as PrismaService);
  let done = 0;
  for (const externalId of externalIds) {
    const place = await prisma.place.findUnique({ where: { externalId }, select: { id: true } });
    if (!place) continue;
    try {
      await service.recalculate(place.id);
      done++;
    } catch (error) {
      console.error(`  ! skor ${externalId}: ${(error as Error).message}`);
    }
  }
  return done;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log(options.dryRun ? 'KURU ÇALIŞMA (veritabanına yazılmaz)\n' : 'İçe aktarım başlıyor\n');

  const { stats: placeStats, importedIds } = await importPlaces(options);
  console.log('\nNoktalar:', placeStats);

  const photoStats = await importPhotos(options);
  if (options.photos) console.log('Fotoğraflar:', photoStats);

  if (!options.dryRun) {
    const scored = await recalculateScores(importedIds);
    console.log(`CampScore hesaplandı: ${scored} nokta`);
  }

  console.log('\nBitti.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
