import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessesService } from '../businesses/businesses.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * İşletme sahipliği kuralları (docs/01 §17). Prisma sahte nesneyle taklit edilir;
 * veritabanı gerekmez.
 */

interface PrismaMock {
  place: { findUnique: jest.Mock };
  business: { create: jest.Mock; findMany: jest.Mock };
  businessPlace: { findFirst: jest.Mock };
}

function createPrisma(): PrismaMock {
  return {
    place: { findUnique: jest.fn() },
    business: { create: jest.fn(), findMany: jest.fn() },
    businessPlace: { findFirst: jest.fn() },
  };
}

const DTO = { placeId: 'place-1', name: 'Çıralı Kamp', evidence: 'Vergi levhası 123456789' };

describe('BusinessesService.claim', () => {
  let prisma: PrismaMock;
  let service: BusinessesService;

  beforeEach(() => {
    prisma = createPrisma();
    service = new BusinessesService(prisma as unknown as PrismaService);
  });

  it('olmayan nokta için talep reddedilir', async () => {
    prisma.place.findUnique.mockResolvedValue(null);
    await expect(service.claim('user-1', DTO)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('yeni talep PENDING olarak oluşturulur ve noktaya bağlanır', async () => {
    prisma.place.findUnique.mockResolvedValue({ id: 'place-1' });
    prisma.businessPlace.findFirst.mockResolvedValue(null);
    prisma.business.create.mockResolvedValue({ id: 'biz-1', verificationStatus: 'PENDING' });

    const result = await service.claim('user-1', DTO);

    expect(result).toEqual({ id: 'biz-1', verificationStatus: 'PENDING' });
    expect(prisma.business.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: 'user-1',
        name: 'Çıralı Kamp',
        evidence: 'Vergi levhası 123456789',
        places: { create: { placeId: 'place-1' } },
      },
    });
  });

  it('kendi bekleyen talebini tekrar gönderemez', async () => {
    prisma.place.findUnique.mockResolvedValue({ id: 'place-1' });
    prisma.businessPlace.findFirst.mockResolvedValue({
      business: { ownerUserId: 'user-1', verificationStatus: 'PENDING' },
    });

    await expect(service.claim('user-1', DTO)).rejects.toMatchObject({
      response: { message: 'BUSINESS_CLAIM_ALREADY_SUBMITTED' },
    });
  });

  it('başkasının talebi olan nokta için talep açılamaz', async () => {
    prisma.place.findUnique.mockResolvedValue({ id: 'place-1' });
    prisma.businessPlace.findFirst.mockResolvedValue({
      business: { ownerUserId: 'other-user', verificationStatus: 'VERIFIED' },
    });

    const error = await service.claim('user-1', DTO).catch((e) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.response.message).toBe('BUSINESS_PLACE_ALREADY_CLAIMED');
  });
});

describe('BusinessesService.officialResponderFor', () => {
  let prisma: PrismaMock;
  let service: BusinessesService;

  beforeEach(() => {
    prisma = createPrisma();
    service = new BusinessesService(prisma as unknown as PrismaService);
  });

  it('doğrulanmış sahip için işletme kimliği döner', async () => {
    prisma.businessPlace.findFirst.mockResolvedValue({ businessId: 'biz-1' });
    await expect(service.officialResponderFor('user-1', 'place-1')).resolves.toBe('biz-1');
  });

  it('yalnızca VERIFIED işletmeler sorgulanır', async () => {
    prisma.businessPlace.findFirst.mockResolvedValue(null);
    await service.officialResponderFor('user-1', 'place-1');

    expect(prisma.businessPlace.findFirst).toHaveBeenCalledWith({
      where: {
        placeId: 'place-1',
        business: { ownerUserId: 'user-1', verificationStatus: 'VERIFIED' },
      },
      select: { businessId: true },
    });
  });

  it('sahip değilse null döner (resmî yanıt hakkı yok)', async () => {
    prisma.businessPlace.findFirst.mockResolvedValue(null);
    await expect(service.officialResponderFor('user-1', 'place-1')).resolves.toBeNull();
  });
});
