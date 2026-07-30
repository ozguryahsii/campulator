import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OptionalAuthGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { SmartMatchSearchDto } from './smart-match.dto';
import { SmartMatchService } from './smart-match.service';

@ApiTags('smart-match')
@Controller('smart-match')
export class SmartMatchController {
  constructor(private readonly smartMatch: SmartMatchService) {}

  @Post('search')
  @HttpCode(200)
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Smart Match araması (misafir erişebilir; girişli ise geçmişe yazılır)',
  })
  search(@Body() dto: SmartMatchSearchDto, @CurrentUser() user?: AccessTokenPayload) {
    return this.smartMatch.search(dto, user?.sub);
  }
}
