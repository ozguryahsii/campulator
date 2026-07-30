import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, VerifiedEmailGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import {
  CreateChangeRequestDto,
  CreatePlaceDto,
  CreateReportDto,
  CreateVerificationDto,
  DuplicateCheckQuery,
} from './contributions.dto';
import { ContributionsService } from './contributions.service';

// Katkı işlemleri: giriş + doğrulanmış e-posta zorunlu (docs/01 §5)
@ApiTags('contributions')
@Controller('places')
@UseGuards(JwtAuthGuard, VerifiedEmailGuard)
@ApiBearerAuth()
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Nokta ekle (güvenilir kullanıcı doğrudan yayın, diğerleri moderasyon)',
  })
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreatePlaceDto) {
    return this.contributions.createPlace(user.sub, dto);
  }

  @Get('duplicate-check')
  @ApiOperation({ summary: 'Form sırasında olası mükerrer kontrolü' })
  duplicateCheck(@Query() query: DuplicateCheckQuery) {
    return this.contributions.findDuplicateCandidates(
      query.latitude,
      query.longitude,
      query.name,
      query.excludeId,
    );
  }

  @Post(':id/verifications')
  @ApiOperation({ summary: 'Bilgi doğrula (imkân onay/itiraz, kapalı görünüyor)' })
  verify(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVerificationDto,
  ) {
    return this.contributions.createVerification(user.sub, id, dto);
  }

  @Post(':id/change-requests')
  @ApiOperation({ summary: 'Değişiklik öner (moderasyon onayına düşer)' })
  changeRequest(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChangeRequestDto,
  ) {
    return this.contributions.createChangeRequest(user.sub, id, dto);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Noktayı şikâyet et' })
  report(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.contributions.createReport(user.sub, id, dto);
  }
}
