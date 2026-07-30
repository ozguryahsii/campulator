import { Module } from '@nestjs/common';
import { CampScoreController } from './campscore.controller';
import { CampScoreService } from './campscore.service';

@Module({
  controllers: [CampScoreController],
  providers: [CampScoreService],
  exports: [CampScoreService],
})
export class CampScoreModule {}
