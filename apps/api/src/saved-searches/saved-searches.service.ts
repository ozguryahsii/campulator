import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmartMatchService } from '../smart-match/smart-match.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './saved-searches.dto';

const toView = (s: {
  id: string;
  name: string;
  searchText: string | null;
  criteriaJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: s.id,
  name: s.name,
  searchText: s.searchText,
  criteria: (s.criteriaJson as { criteria?: string[] })?.criteria ?? [],
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

@Injectable()
export class SavedSearchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smartMatch: SmartMatchService,
  ) {}

  async list(userId: string) {
    const searches = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return searches.map(toView);
  }

  async create(userId: string, dto: CreateSavedSearchDto) {
    const search = await this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name.trim(),
        searchText: dto.searchText ?? null,
        criteriaJson: { criteria: dto.criteria },
      },
    });
    return toView(search);
  }

  private async findOwned(userId: string, id: string) {
    const search = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!search) throw new NotFoundException('SAVED_SEARCH_NOT_FOUND');
    return search;
  }

  async update(userId: string, id: string, dto: UpdateSavedSearchDto) {
    const existing = await this.findOwned(userId, id);
    const search = await this.prisma.savedSearch.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.searchText !== undefined && { searchText: dto.searchText }),
        ...(dto.criteria !== undefined && { criteriaJson: { criteria: dto.criteria } }),
      },
    });
    return toView(search);
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOwned(userId, id);
    await this.prisma.savedSearch.delete({ where: { id: existing.id } });
    return { deleted: true };
  }

  /** Kayıtlı aramayı Smart Match ile çalıştırır. */
  async run(userId: string, id: string) {
    const search = await this.findOwned(userId, id);
    const criteria = (search.criteriaJson as { criteria?: string[] })?.criteria ?? [];
    return this.smartMatch.search({ searchText: search.searchText ?? undefined, criteria }, userId);
  }

  async history(userId: string, limit = 10) {
    const entries = await this.prisma.searchHistoryEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return entries.map((entry) => ({
      id: entry.id,
      searchText: entry.searchText,
      criteria: (entry.criteriaJson as { criteria?: string[] })?.criteria ?? [],
      createdAt: entry.createdAt,
    }));
  }
}
