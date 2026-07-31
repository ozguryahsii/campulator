import { Module } from '@nestjs/common';
import { CampScoreModule } from '../campscore/campscore.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CampScoreModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
