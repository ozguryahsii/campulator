import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CampScoreService } from './campscore.service';

@ApiTags('campscore')
@Controller('places')
export class CampScoreController {
  constructor(private readonly campScore: CampScoreService) {}

  @Get(':id/score-breakdown')
  @ApiOperation({ summary: 'CampScore kırılımı: bileşenler, ağırlıklar, etiket' })
  breakdown(@Param('id', ParseUUIDPipe) id: string) {
    return this.campScore.breakdown(id);
  }
}
