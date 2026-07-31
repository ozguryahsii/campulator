import { Module } from '@nestjs/common';
import { SmartMatchModule } from '../smart-match/smart-match.module';
import { SavedSearchesController } from './saved-searches.controller';
import { SavedSearchesService } from './saved-searches.service';

@Module({
  imports: [SmartMatchModule],
  controllers: [SavedSearchesController],
  providers: [SavedSearchesService],
})
export class SavedSearchesModule {}
