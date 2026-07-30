import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';

class UpsertCollectionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class AddItemDto {
  @ApiProperty()
  @IsUUID()
  placeId: string;
}

class ReorderDto {
  @ApiProperty({ description: 'Yeni sıra: nokta id listesi' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  placeIds: string[];
}

/** Koleksiyonlar özeldir (docs/01 §18); paylaşım sonraki faz (share_token hazır). */
@ApiTags('collections')
@Controller('collections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollectionsController {
  constructor(private readonly prisma: PrismaService) {}

  private async owned(userId: string, id: string) {
    const collection = await this.prisma.collection.findFirst({ where: { id, userId } });
    if (!collection) throw new NotFoundException('COLLECTION_NOT_FOUND');
    return collection;
  }

  @Get()
  @ApiOperation({ summary: 'Koleksiyonlarım (noktalarıyla)' })
  async list(@CurrentUser() user: AccessTokenPayload) {
    const collections = await this.prisma.collection.findMany({
      where: { userId: user.sub },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            place: {
              include: { score: true, activities: { include: { activity: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      items: c.items.map((item) => ({
        placeId: item.placeId,
        sortOrder: item.sortOrder,
        place: {
          id: item.place.id,
          name: item.place.name,
          city: item.place.city,
          feeType: item.place.feeType,
          operatingStatus: item.place.operatingStatus,
          score: item.place.score ? { overall: item.place.score.overallScore } : null,
          activities: item.place.activities
            .filter((pa) => pa.isAllowed)
            .sort((a, b) => a.activity.markerPriority - b.activity.markerPriority)
            .map((pa) => pa.activity.code),
        },
      })),
    }));
  }

  @Post()
  @ApiOperation({ summary: 'Koleksiyon oluştur' })
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpsertCollectionDto) {
    return this.prisma.collection.create({
      data: { userId: user.sub, name: dto.name.trim(), description: dto.description ?? null },
      select: { id: true, name: true, description: true },
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Koleksiyonu güncelle' })
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCollectionDto,
  ) {
    await this.owned(user.sub, id);
    return this.prisma.collection.update({
      where: { id },
      data: { name: dto.name.trim(), description: dto.description ?? null },
      select: { id: true, name: true, description: true },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Koleksiyonu sil' })
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    await this.owned(user.sub, id);
    await this.prisma.collection.delete({ where: { id } });
    return { deleted: true };
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Koleksiyona nokta ekle (bir nokta birden çok koleksiyonda olabilir)' })
  async addItem(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddItemDto,
  ) {
    await this.owned(user.sub, id);
    const place = await this.prisma.place.findUnique({ where: { id: dto.placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');
    const maxOrder = await this.prisma.collectionItem.aggregate({
      where: { collectionId: id },
      _max: { sortOrder: true },
    });
    await this.prisma.collectionItem.upsert({
      where: { collectionId_placeId: { collectionId: id, placeId: dto.placeId } },
      create: {
        collectionId: id,
        placeId: dto.placeId,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      update: {},
    });
    return { added: true };
  }

  @Delete(':id/items/:placeId')
  @ApiOperation({ summary: 'Koleksiyondan nokta çıkar' })
  async removeItem(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('placeId', ParseUUIDPipe) placeId: string,
  ) {
    await this.owned(user.sub, id);
    await this.prisma.collectionItem.deleteMany({ where: { collectionId: id, placeId } });
    return { removed: true };
  }

  @Patch(':id/reorder')
  @ApiOperation({ summary: 'Koleksiyon içi sıralama' })
  async reorder(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderDto,
  ) {
    await this.owned(user.sub, id);
    if (dto.placeIds.length === 0) throw new BadRequestException('REORDER_EMPTY');
    await this.prisma.$transaction(
      dto.placeIds.map((placeId, index) =>
        this.prisma.collectionItem.updateMany({
          where: { collectionId: id, placeId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return { reordered: true };
  }
}
