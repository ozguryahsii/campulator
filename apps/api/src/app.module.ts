import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { CampScoreModule } from './campscore/campscore.module';
import { CollectionsModule } from './collections/collections.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlacesModule } from './places/places.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { SmartMatchModule } from './smart-match/smart-match.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoutesModule } from './routes/routes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    // Rate limiting: dakikada 120 istek (docs/07 Faz 11)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PlacesModule,
    CampScoreModule,
    SmartMatchModule,
    SavedSearchesModule,
    BusinessesModule,
    ReviewsModule,
    StorageModule,
    CollectionsModule,
    RoutesModule,
    NotificationsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
