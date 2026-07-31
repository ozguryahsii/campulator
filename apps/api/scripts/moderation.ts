/**
 * Moderasyon kuyruğunu komut satırından yönetir. Binlerce içe aktarılmış
 * noktayı panelden tek tek onaylamak pratik değil.
 *
 *   # Durum özeti
 *   pnpm --filter @campulator/api moderation -- --status
 *
 *   # Yarım kalan onayları onar (hiçbir onay kaybolmaz)
 *   pnpm --filter @campulator/api moderation -- --reconcile
 *
 *   # OpenStreetMap'ten gelen tüm bekleyen noktaları yayımla
 *   pnpm --filter @campulator/api moderation -- --approve-imports
 *
 *   # Kaynak ayrımı olmadan bekleyen tüm noktaları yayımla
 *   pnpm --filter @campulator/api moderation -- --approve-all
 *
 *   # Onay bekleyen tüm fotoğrafları yayımla
 *   pnpm --filter @campulator/api moderation -- --approve-photos
 *
 * Tüm işlemler idempotent'tir; tekrar çalıştırmak zarar vermez.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLACE_ITEM_TYPES = ['PLACE', 'DUPLICATE'];

async function status() {
  const [pendingItems, pendingPlaces, publishedPlaces, pendingPhotos] = await Promise.all([
    prisma.moderationItem.count({ where: { status: 'PENDING' } }),
    prisma.place.count({ where: { publicationStatus: 'PENDING_REVIEW' } }),
    prisma.place.count({ where: { publicationStatus: 'PUBLISHED' } }),
    prisma.photo.count({ where: { status: 'PENDING' } }),
  ]);
  console.log('Kuyrukta bekleyen kayıt :', pendingItems);
  console.log('Onay bekleyen nokta     :', pendingPlaces);
  console.log('Yayında olan nokta      :', publishedPlaces);
  console.log('Onay bekleyen fotoğraf  :', pendingPhotos);
}

/**
 * Kuyruk ile noktaların yayın durumunu tutarlı hâle getirir. Panelden tek tek
 * onaylarken istek yarıda kesilirse (rate limit, sekme kapanması) iki taraf
 * ayrışabiliyor; bu iki yönü de onarır.
 */
async function reconcile() {
  const items = await prisma.moderationItem.findMany({
    where: { itemType: { in: PLACE_ITEM_TYPES } },
    select: { id: true, itemId: true, status: true },
  });
  const places = await prisma.place.findMany({
    where: { id: { in: items.map((item) => item.itemId) } },
    select: { id: true, publicationStatus: true },
  });
  const statusById = new Map(places.map((place) => [place.id, place.publicationStatus]));

  const toPublish = items
    .filter((item) => item.status === 'APPROVED')
    .filter((item) => statusById.get(item.itemId) === 'PENDING_REVIEW')
    .map((item) => item.itemId);

  const staleItems = items
    .filter((item) => item.status === 'PENDING')
    .filter((item) => {
      const placeStatus = statusById.get(item.itemId);
      return placeStatus === 'PUBLISHED' || placeStatus === 'REJECTED';
    });

  if (toPublish.length > 0) {
    await prisma.place.updateMany({
      where: { id: { in: toPublish } },
      data: { publicationStatus: 'PUBLISHED' },
    });
  }

  for (const item of staleItems) {
    await prisma.moderationItem.update({
      where: { id: item.id },
      data: {
        status: statusById.get(item.itemId) === 'PUBLISHED' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
      },
    });
  }

  console.log(`Onaylı ama yayımlanmamış nokta yayımlandı : ${toPublish.length}`);
  console.log(`Kuyrukta boşuna bekleyen kayıt kapatıldı  : ${staleItems.length}`);
}

async function approve(dataSource?: string) {
  const pending = await prisma.moderationItem.findMany({
    where: { status: 'PENDING', itemType: { in: PLACE_ITEM_TYPES } },
    select: { id: true, itemId: true },
  });
  if (pending.length === 0) {
    console.log('Onay bekleyen nokta yok.');
    return;
  }

  const places = await prisma.place.findMany({
    where: {
      id: { in: pending.map((item) => item.itemId) },
      ...(dataSource ? { dataSource } : {}),
    },
    select: { id: true },
  });
  const placeIds = new Set(places.map((place) => place.id));
  const targets = pending.filter((item) => placeIds.has(item.itemId));

  if (targets.length === 0) {
    console.log('Filtreye uyan bekleyen nokta yok.');
    return;
  }

  const [placeResult, itemResult] = await prisma.$transaction([
    prisma.place.updateMany({
      where: { id: { in: targets.map((item) => item.itemId) } },
      data: { publicationStatus: 'PUBLISHED' },
    }),
    prisma.moderationItem.updateMany({
      where: { id: { in: targets.map((item) => item.id) } },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    }),
  ]);

  console.log(`Yayımlanan nokta : ${placeResult.count}`);
  console.log(`Kapatılan kayıt  : ${itemResult.count}`);
}

/**
 * Onay bekleyen fotoğrafları toplu sonuçlandırır. Yayımlanan fotoğrafı olan
 * noktaların "fotoğraf bekleniyor" etiketi de kaldırılır.
 */
async function resolvePhotos(decision: 'APPROVE' | 'REJECT') {
  const pending = await prisma.photo.findMany({
    where: { status: 'PENDING' },
    select: { id: true, placeId: true },
  });
  if (pending.length === 0) {
    console.log('Onay bekleyen fotoğraf yok.');
    return;
  }

  const status = decision === 'APPROVE' ? 'PUBLISHED' : 'REMOVED';
  const result = await prisma.photo.updateMany({
    where: { id: { in: pending.map((photo) => photo.id) } },
    data: { status },
  });

  // Etkilenen noktaların foto durumunu gerçek duruma göre tazele
  const placeIds = [...new Set(pending.map((photo) => photo.placeId).filter(Boolean))] as string[];
  let refreshed = 0;
  for (const placeId of placeIds) {
    const published = await prisma.photo.count({ where: { placeId, status: 'PUBLISHED' } });
    await prisma.place.update({
      where: { id: placeId },
      data: { photoStatus: published > 0 ? 'PUBLISHED' : 'PENDING' },
    });
    refreshed++;
  }

  console.log(`${decision === 'APPROVE' ? 'Yayımlanan' : 'Kaldırılan'} fotoğraf : ${result.count}`);
  console.log(`Güncellenen nokta        : ${refreshed}`);
}

async function main() {
  const args = process.argv.slice(2);
  const has = (flag: string) => args.includes(flag);

  if (args.length === 0 || has('--help')) {
    console.log(
      [
        'Kullanım:',
        '  --status            Durum özeti',
        '  --reconcile         Yarım kalan onayları onar',
        '  --approve-imports   OpenStreetMap kaynaklı bekleyen noktaları yayımla',
        '  --approve-all       Bekleyen tüm noktaları yayımla',
        '  --approve-photos    Onay bekleyen tüm fotoğrafları yayımla',
        '  --reject-photos     Onay bekleyen tüm fotoğrafları kaldır',
      ].join('\n'),
    );
    return;
  }

  // Onaylamadan önce daima onarım: yarım kalmış işler kaybolmasın
  if (has('--reconcile') || has('--approve-imports') || has('--approve-all')) {
    await reconcile();
    console.log('');
  }

  if (has('--approve-imports')) await approve('openstreetmap');
  else if (has('--approve-all')) await approve();

  if (has('--approve-photos')) await resolvePhotos('APPROVE');
  else if (has('--reject-photos')) await resolvePhotos('REJECT');

  console.log('');
  await status();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
