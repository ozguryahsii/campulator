import { AdminService } from '../admin/admin.service';
import type { CampScoreService } from '../campscore/campscore.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * "Kapalı görünüyor" bildirimi onaylandığında noktanın çalışma durumu
 * kalıcı kapalıya çekilmeli (docs/01 §21). Regresyon testi: bu dal
 * başlangıçta hiç yazılmamıştı ve onay hiçbir etki yaratmıyordu.
 */
describe('AdminService.resolveModerationItem — PLACE_CLOSED_REPORT', () => {
  const PLACE = { id: 'place-1', name: 'Çıralı', operatingStatus: 'OPEN', createdById: 'user-9' };

  function build(itemType: string) {
    const prisma = {
      moderationItem: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'mod-1',
          itemType,
          itemId: PLACE.id,
          status: 'PENDING',
          reason: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      place: { findUnique: jest.fn().mockResolvedValue(PLACE), update: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const campScore = { recalculate: jest.fn() };
    const notifications = { notify: jest.fn() };
    const service = new AdminService(
      prisma as unknown as PrismaService,
      campScore as unknown as CampScoreService,
      notifications as unknown as NotificationsService,
    );
    return { service, prisma, campScore, notifications };
  }

  it('onaylanınca nokta kalıcı kapalı olur ve skor yeniden hesaplanır', async () => {
    const { service, prisma, campScore } = build('PLACE_CLOSED_REPORT');

    await service.resolveModerationItem('admin-1', 'mod-1', 'APPROVE');

    expect(prisma.place.update).toHaveBeenCalledWith({
      where: { id: PLACE.id },
      data: { operatingStatus: 'PERMANENTLY_CLOSED' },
    });
    expect(campScore.recalculate).toHaveBeenCalledWith(PLACE.id);
  });

  it('nokta sahibine bildirim gönderilir', async () => {
    const { service, notifications } = build('PLACE_CLOSED_REPORT');

    await service.resolveModerationItem('admin-1', 'mod-1', 'APPROVE');

    expect(notifications.notify).toHaveBeenCalledWith(
      'user-9',
      'SYSTEM',
      expect.objectContaining({ placeId: PLACE.id, operatingStatus: 'PERMANENTLY_CLOSED' }),
    );
  });

  it('reddedilirse noktaya dokunulmaz', async () => {
    const { service, prisma } = build('PLACE_CLOSED_REPORT');

    await service.resolveModerationItem('admin-1', 'mod-1', 'REJECT');

    expect(prisma.place.update).not.toHaveBeenCalled();
  });

  it('kapalı bildirimi noktayı yeniden yayınlamaz (PLACE dalına düşmemeli)', async () => {
    const { service, prisma } = build('PLACE_CLOSED_REPORT');

    await service.resolveModerationItem('admin-1', 'mod-1', 'APPROVE');

    const calls = prisma.place.update.mock.calls as { data: Record<string, unknown> }[][];
    expect(calls.every(([arg]) => !('publicationStatus' in arg.data))).toBe(true);
  });
});
