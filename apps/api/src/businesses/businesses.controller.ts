import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, VerifiedEmailGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { ClaimBusinessDto } from './businesses.dto';
import { BusinessesService } from './businesses.service';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kendi işletmelerim ve doğrulama durumları' })
  mine(@CurrentUser() user: AccessTokenPayload) {
    return this.businesses.mine(user.sub);
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nokta sahipliği talebi (admin onayı gerekir)' })
  claim(@CurrentUser() user: AccessTokenPayload, @Body() dto: ClaimBusinessDto) {
    return this.businesses.claim(user.sub, dto);
  }
}
