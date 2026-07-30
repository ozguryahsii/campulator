import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CampScoreModule } from './campscore/campscore.module';
import { CollectionsModule } from './collections/collections.module';
import { HealthModule } from './health/health.module';
import { PlacesModule } from './places/places.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { SmartMatchModule } from './smart-match/smart-match.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PlacesModule,
    CampScoreModule,
    SmartMatchModule,
    SavedSearchesModule,
    ReviewsModule,
    StorageModule,
    CollectionsModule,
  ],
})
export class AppModule {}
