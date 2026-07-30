import { Module } from '@nestjs/common';
import { CampScoreModule } from '../campscore/campscore.module';
import { RatingsService } from './ratings.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [CampScoreModule],
  controllers: [ReviewsController],
  providers: [RatingsService, ReviewsService],
})
export class ReviewsModule {}
