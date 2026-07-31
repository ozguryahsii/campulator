import { AdminService } from '../admin/admin.service';
import type { CampScoreService } from '../campscore/campscore.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Toplu onay ve onarım. Panelden tek tek onaylarken istek yarıda kesilince
 * (rate limit, sekme kapanması) kuyruk ile noktanın yayın durumu ayrışıyordu;
 * onarım bunu iki yönde de kapatmalı ve hiçbir onay kaybolmamalı.
 */
function build(options: {
  items: { id: string; itemId: string; status: string }[];
  places: { id: string; publicationStatus: string; dataSource?: string }[];
}) {
  const prisma = {
    moderationItem: {
      findMany: jest.fn().mockResolvedValue(options.items),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockImplementation(({ where }) => ({
        count: (where.id.in as string[]).length,
      })),
    },
    place: {
      findMany: jest.fn().mockResolvedValue(options.places),
      updateMany: jest.fn().mockImplementation(({ where }) => ({
        count: (where.id.in as string[]).length,
      })),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation((operations: unknown[]) => Promise.all(operations)),
  };
  const service = new AdminService(
    prisma as unknown as PrismaService,
    { recalculate: jest.fn() } as unknown as CampScoreService,
    { notify: jest.fn() } as unknown as NotificationsService,
  );
  return { service, prisma };
}

describe('AdminService.reconcileModeration', () => {
  it('kuyrukta onaylı ama yayımlanmamış noktayı yayımlar', async () => {
    const { service, prisma } = build({
      items: [{ id: 'mod-1', itemId: 'place-1', status: 'APPROVED' }],
      places: [{ id: 'place-1', publicationStatus: 'PENDING_REVIEW' }],
    });

    const result = await service.reconcileModeration('admin-1');

    expect(result.publishedFromApproved).toBe(1);
    expect(prisma.place.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['place-1'] } },
      data: { publicationStatus: 'PUBLISHED' },
    });
  });

  it('yayımlanmış noktanın kuyrukta bekleyen kaydını kapatır', async () => {
    const { service, prisma } = build({
      items: [{ id: 'mod-2', itemId: 'place-2', status: 'PENDING' }],
      places: [{ id: 'place-2', publicationStatus: 'PUBLISHED' }],
    });

    const result = await service.reconcileModeration('admin-1');

    expect(result.closedStaleItems).toBe(1);
    expect(prisma.moderationItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mod-2' },
        data: expect.objectContaining({ status: 'APPROVED', reviewedBy: 'admin-1' }),
      }),
    );
  });

  it('reddedilen nokta yayımlanmaz, kaydı REJECTED kapanır', async () => {
    const { service, prisma } = build({
      items: [{ id: 'mod-3', itemId: 'place-3', status: 'PENDING' }],
      places: [{ id: 'place-3', publicationStatus: 'REJECTED' }],
    });

    await service.reconcileModeration('admin-1');

    expect(prisma.place.updateMany).not.toHaveBeenCalled();
    expect(prisma.moderationItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }),
    );
  });

  it('tutarlı kayıtlara dokunmaz', async () => {
    const { service, prisma } = build({
      items: [{ id: 'mod-4', itemId: 'place-4', status: 'PENDING' }],
      places: [{ id: 'place-4', publicationStatus: 'PENDING_REVIEW' }],
    });

    const result = await service.reconcileModeration('admin-1');

    expect(result).toEqual({ publishedFromApproved: 0, closedStaleItems: 0 });
    expect(prisma.place.updateMany).not.toHaveBeenCalled();
    expect(prisma.moderationItem.update).not.toHaveBeenCalled();
  });
});

describe('AdminService.bulkResolvePlaces', () => {
  it('bekleyen noktaları tek işlemde yayımlar', async () => {
    const { service, prisma } = build({
      items: [
        { id: 'mod-1', itemId: 'place-1', status: 'PENDING' },
        { id: 'mod-2', itemId: 'place-2', status: 'PENDING' },
      ],
      places: [
        { id: 'place-1', publicationStatus: 'PENDING_REVIEW' },
        { id: 'place-2', publicationStatus: 'PENDING_REVIEW' },
      ],
    });

    const result = await service.bulkResolvePlaces('admin-1', { decision: 'APPROVE' });

    expect(result).toEqual({ places: 2, items: 2 });
    expect(prisma.place.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['place-1', 'place-2'] } },
      data: { publicationStatus: 'PUBLISHED' },
    });
    // 1300 ayrı denetim satırı değil, tek özet
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('kaynak filtresine uymayan noktaları dışarıda bırakır', async () => {
    const { service, prisma } = build({
      items: [
        { id: 'mod-1', itemId: 'place-1', status: 'PENDING' },
        { id: 'mod-2', itemId: 'place-2', status: 'PENDING' },
      ],
      // Kullanıcı katkısı nokta sorguya hiç dönmez
      places: [{ id: 'place-1', publicationStatus: 'PENDING_REVIEW' }],
    });

    const result = await service.bulkResolvePlaces('admin-1', {
      decision: 'APPROVE',
      dataSource: 'openstreetmap',
    });

    expect(result).toEqual({ places: 1, items: 1 });
    expect(prisma.place.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dataSource: 'openstreetmap' }),
      }),
    );
  });

  it('bekleyen kayıt yoksa hiçbir şey yazmaz', async () => {
    const { service, prisma } = build({ items: [], places: [] });

    const result = await service.bulkResolvePlaces('admin-1', { decision: 'APPROVE' });

    expect(result).toEqual({ places: 0, items: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('REJECT kararında noktalar reddedilir', async () => {
    const { service, prisma } = build({
      items: [{ id: 'mod-1', itemId: 'place-1', status: 'PENDING' }],
      places: [{ id: 'place-1', publicationStatus: 'PENDING_REVIEW' }],
    });

    await service.bulkResolvePlaces('admin-1', { decision: 'REJECT' });

    expect(prisma.place.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['place-1'] } },
      data: { publicationStatus: 'REJECTED' },
    });
  });
});
