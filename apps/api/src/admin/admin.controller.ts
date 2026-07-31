import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TrustLevel } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { AdminService } from './admin.service';

class PageQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

class ModerationDecisionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT', 'ARCHIVE'] })
  @IsIn(['APPROVE', 'REJECT', 'ARCHIVE'])
  decision: 'APPROVE' | 'REJECT' | 'ARCHIVE';

  @ApiPropertyOptional({ description: 'Dahili moderasyon notu' })
  @IsOptional()
  @IsString()
  note?: string;
}

class MergeDto {
  @ApiProperty({ description: 'Birleştirilecek (kapatılacak) nokta' })
  @IsUUID()
  sourceId: string;

  @ApiProperty({ description: 'Hedef (korunacak) nokta' })
  @IsUUID()
  targetId: string;
}

class TrustLevelDto {
  @ApiProperty({ enum: ['NEW_USER', 'CONTRIBUTOR', 'TRUSTED_CONTRIBUTOR', 'EXPERT_CAMPER'] })
  @IsIn(['NEW_USER', 'CONTRIBUTOR', 'TRUSTED_CONTRIBUTOR', 'EXPERT_CAMPER'])
  trustLevel: TrustLevel;
}

class UserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status: 'ACTIVE' | 'SUSPENDED';
}

class ScoreConfigDto {
  @ApiProperty({ example: 0.45 })
  @IsNumber()
  @Min(0)
  @Max(1)
  features: number;

  @ApiProperty({ example: 0.35 })
  @IsNumber()
  @Min(0)
  @Max(1)
  userRating: number;

  @ApiProperty({ example: 0.2 })
  @IsNumber()
  @Min(0)
  @Max(1)
  atmosphere: number;
}

class ReportActionDto {
  @ApiProperty({ enum: ['RESOLVE', 'DISMISS'] })
  @IsIn(['RESOLVE', 'DISMISS'])
  action: 'RESOLVE' | 'DISMISS';
}

class BulkResolveDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ description: 'Yalnızca bu kaynaktan gelen noktalar (ör. openstreetmap)' })
  @IsOptional()
  @IsString()
  dataSource?: string;

  @ApiPropertyOptional({ description: 'En fazla kaç kayıt işlensin' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number;
}

class PhotoActionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';
}

class PlaceTranslationDto {
  @ApiPropertyOptional({ description: 'Boş bırakılırsa varsayılan ad kullanılır' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ description: 'Boş bırakılırsa varsayılan açıklama kullanılır' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

class BusinessVerifyDto {
  @ApiProperty()
  @IsIn([true, false])
  approve: boolean;
}

// Tüm admin uçları MODERATOR ve üzeri rol gerektirir (docs/02 §4)
@ApiTags('admin')
@Controller('admin')
// Panelde her onay birkaç istek üretiyor (işlem + liste + panel tazeleme);
// genel 120/dk sınırı arka arkaya onay yapan moderatörü kilitliyordu.
// Uçlar zaten kimlik + rol korumalı, bu yüzden sınır yükseltildi.
@Throttle({ default: { ttl: 60_000, limit: 1200 } })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MODERATOR')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard sayaçları' })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('moderation')
  @ApiOperation({ summary: 'Moderasyon kuyruğu (FIFO)' })
  moderation(@Query() query: PageQuery) {
    return this.admin.moderationQueue({
      status: query.status,
      itemType: query.itemType,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Post('moderation/bulk-resolve')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Onay bekleyen noktaları toplu sonuçlandır (içe aktarım için)',
  })
  bulkResolve(@CurrentUser() user: AccessTokenPayload, @Body() dto: BulkResolveDto) {
    return this.admin.bulkResolvePlaces(user.sub, {
      decision: dto.decision,
      dataSource: dto.dataSource,
      limit: dto.limit,
    });
  }

  @Post('moderation/reconcile')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Kuyruk ile nokta yayın durumlarını tutarlı hâle getirir (yarım kalan onaylar)',
  })
  reconcile(@CurrentUser() user: AccessTokenPayload) {
    return this.admin.reconcileModeration(user.sub);
  }

  @Post('moderation/:id/resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Moderasyon kararı: onayla / reddet / arşivle' })
  resolve(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerationDecisionDto,
  ) {
    return this.admin.resolveModerationItem(user.sub, id, dto.decision, dto.note);
  }

  @Post('places/merge')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mükerrer nokta birleştirme (transaction, geçmiş korunur)' })
  merge(@CurrentUser() user: AccessTokenPayload, @Body() dto: MergeDto) {
    return this.admin.mergePlaces(user.sub, dto.sourceId, dto.targetId);
  }

  @Get('places')
  @ApiOperation({ summary: 'Nokta yönetimi listesi (gerçek koordinatlar dahil)' })
  places(@Query() query: PageQuery) {
    return this.admin.listPlaces({
      status: query.status,
      search: query.search,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Get('places/:id/translations')
  @ApiOperation({ summary: 'Noktanın dil sürümleri' })
  translations(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.placeTranslations(id);
  }

  @Put('places/:id/translations/:locale')
  @ApiOperation({ summary: 'Dil sürümü kaydet (boş alan varsayılana düşer)' })
  saveTranslation(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale') locale: string,
    @Body() dto: PlaceTranslationDto,
  ) {
    return this.admin.savePlaceTranslation(user.sub, id, locale, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Kullanıcı listesi (güven puanı admin görünür)' })
  users(@Query() query: PageQuery) {
    return this.admin.listUsers({
      search: query.search,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Patch('users/:id/trust-level')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Güven seviyesi değiştir' })
  trustLevel(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TrustLevelDto,
  ) {
    return this.admin.setTrustLevel(user.sub, id, dto.trustLevel);
  }

  @Patch('users/:id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Kullanıcıyı askıya al / aktifleştir' })
  userStatus(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UserStatusDto,
  ) {
    return this.admin.setUserStatus(user.sub, id, dto.status);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Şikâyet listesi' })
  reports(@Query() query: PageQuery) {
    return this.admin.listReports({
      status: query.status,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Post('reports/:id/resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Şikâyeti sonuçlandır' })
  resolveReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportActionDto,
  ) {
    return this.admin.resolveReport(user.sub, id, dto.action);
  }

  @Get('photos')
  @ApiOperation({ summary: 'Fotoğraf moderasyon listesi (varsayılan: onay bekleyenler)' })
  photos(@Query() query: PageQuery) {
    return this.admin.listPhotos({
      status: query.status,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 24,
    });
  }

  @Post('photos/bulk-resolve')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Onay bekleyen tüm fotoğrafları yayımla / kaldır' })
  bulkResolvePhotos(@CurrentUser() user: AccessTokenPayload, @Body() dto: PhotoActionDto) {
    return this.admin.bulkResolvePhotos(user.sub, dto.action);
  }

  @Post('photos/:id/resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Fotoğrafı yayımla veya kaldır' })
  resolvePhoto(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PhotoActionDto,
  ) {
    return this.admin.resolvePhoto(user.sub, id, dto.action);
  }

  @Get('score-config')
  @ApiOperation({ summary: 'CampScore ağırlıkları + imkân ağırlıkları' })
  scoreConfig() {
    return this.admin.getScoreConfig();
  }

  @Patch('score-config')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Ağırlıkları güncelle (toplam 1 olmalı; tüm skorlar yeniden hesaplanır)',
  })
  updateScoreConfig(@CurrentUser() user: AccessTokenPayload, @Body() dto: ScoreConfigDto) {
    return this.admin.updateScoreConfig(user.sub, dto);
  }

  @Get('businesses')
  @ApiOperation({ summary: 'İşletme listesi' })
  businesses(@Query() query: PageQuery) {
    return this.admin.listBusinesses({ page: query.page ?? 1, pageSize: query.pageSize ?? 20 });
  }

  @Post('businesses/:id/verify')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'İşletme doğrulama (manuel)' })
  verifyBusiness(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BusinessVerifyDto,
  ) {
    return this.admin.verifyBusiness(user.sub, id, dto.approve);
  }

  @Get('audit-logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Denetim kayıtları' })
  auditLogs(@Query() query: PageQuery) {
    return this.admin.auditLogs({ page: query.page ?? 1, pageSize: query.pageSize ?? 50 });
  }
}
