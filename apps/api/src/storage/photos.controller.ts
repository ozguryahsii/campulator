import {
  Controller,
  Delete,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, VerifiedEmailGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

const uploadBody = {
  schema: {
    type: 'object' as const,
    properties: { file: { type: 'string' as const, format: 'binary' as const } },
  },
};

@ApiTags('photos')
@Controller()
@UseGuards(JwtAuthGuard, VerifiedEmailGuard)
@ApiBearerAuth()
export class PhotosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Post('places/:id/photos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({ summary: 'Noktaya fotoğraf yükle (anında yayınlanır)' })
  async uploadPlacePhoto(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) placeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const storageKey = this.storage.upload(file, `places/${placeId}`);
    const photo = await this.prisma.photo.create({
      data: {
        uploaderUserId: user.sub,
        placeId,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: 'PUBLISHED',
      },
    });
    // "Fotoğraf bekleniyor" etiketi kalkar
    if (place.photoStatus === 'PENDING') {
      await this.prisma.place.update({
        where: { id: placeId },
        data: { photoStatus: 'PUBLISHED' },
      });
    }
    return { id: photo.id, storageKey, url: this.storage.getPublicUrl(storageKey) };
  }

  @Post('reviews/:id/photos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({ summary: 'Yoruma fotoğraf ekle' })
  async uploadReviewPhoto(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    if (review.userId !== user.sub) throw new ForbiddenException('REVIEW_NOT_OWNER');

    const storageKey = this.storage.upload(file, `reviews/${reviewId}`);
    const photo = await this.prisma.photo.create({
      data: {
        uploaderUserId: user.sub,
        placeId: review.placeId,
        reviewId,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: 'PUBLISHED',
      },
    });
    return { id: photo.id, storageKey, url: this.storage.getPublicUrl(storageKey) };
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Kendi fotoğrafını sil' })
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('PHOTO_NOT_FOUND');
    if (photo.uploaderUserId !== user.sub) throw new ForbiddenException('PHOTO_NOT_OWNER');

    this.storage.delete(photo.storageKey);
    await this.prisma.photo.delete({ where: { id } });
    return { deleted: true };
  }
}
