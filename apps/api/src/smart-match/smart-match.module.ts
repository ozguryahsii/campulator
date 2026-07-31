import { Module } from '@nestjs/common';
import { SmartMatchController } from './smart-match.controller';
import { SmartMatchService } from './smart-match.service';

@Module({
  controllers: [SmartMatchController],
  providers: [SmartMatchService],
  exports: [SmartMatchService],
})
export class SmartMatchModule {}
