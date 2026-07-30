import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, OptionalAuthGuard, VerifiedEmailGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { UpsertRatingDto } from './ratings.dto';
import { RatingsService } from './ratings.service';
import {
  CreateReplyDto,
  CreateReviewDto,
  ListReviewsQuery,
  ReportReviewDto,
  UpdateReviewDto,
} from './reviews.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('ratings-reviews')
@Controller()
export class ReviewsController {
  constructor(
    private readonly ratings: RatingsService,
    private readonly reviews: ReviewsService,
  ) {}

  // ---- Puanlar ----

  @Get('places/:id/ratings/summary')
  @ApiOperation({ summary: 'Puan özeti (ortalama + alt kategoriler; misafir erişir)' })
  summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.ratings.summary(id);
  }

  @Get('places/:id/ratings/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Benim aktif puanım' })
  myRating(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.ratings.myRating(user.sub, id);
  }

  @Post('places/:id/ratings')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Puan ver/güncelle (yılda bir yeni değerlendirme)' })
  rate(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertRatingDto,
  ) {
    return this.ratings.upsert(user.sub, id, dto);
  }

  // ---- Yorumlar ----

  @Get('places/:id/reviews')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Yorum listesi (yeni/faydalı/yüksek/düşük/fotoğraflı)' })
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListReviewsQuery,
    @CurrentUser() user?: AccessTokenPayload,
  ) {
    return this.reviews.list(id, query, user?.sub);
  }

  @Post('places/:id/reviews')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yorum yaz (anında yayınlanır)' })
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.sub, id, dto);
  }

  @Patch('reviews/:id')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kendi yorumunu düzenle' })
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(user.sub, id, dto);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kendi yorumunu sil' })
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.remove(user.sub, id);
  }

  @Post('reviews/:id/replies')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yoruma yanıt (tek seviye)' })
  reply(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.reviews.reply(user.sub, id, dto);
  }

  @Post('reviews/:id/helpful')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Faydalı işaretle' })
  helpful(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.markHelpful(user.sub, id, true);
  }

  @Delete('reviews/:id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Faydalı işaretini kaldır' })
  unhelpful(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.markHelpful(user.sub, id, false);
  }

  @Post('reviews/:id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yorumu şikâyet et (yayında kalır, moderasyona düşer)' })
  report(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviews.report(user.sub, id, dto);
  }
}
