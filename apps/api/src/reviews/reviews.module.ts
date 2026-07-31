import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { CampScoreModule } from '../campscore/campscore.module';
import { RatingsService } from './ratings.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [CampScoreModule, BusinessesModule],
  controllers: [ReviewsController],
  providers: [RatingsService, ReviewsService],
})
export class ReviewsModule {}
