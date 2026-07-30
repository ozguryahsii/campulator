import { Module } from '@nestjs/common';
import { CampScoreModule } from '../campscore/campscore.module';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  imports: [CampScoreModule],
  controllers: [ContributionsController, PlacesController],
  providers: [PlacesService, ContributionsService],
  exports: [PlacesService],
})
export class PlacesModule {}
