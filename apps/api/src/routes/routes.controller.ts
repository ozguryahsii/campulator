import { Body, Controller, HttpCode, Logger, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsLatitude, IsLongitude, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class OriginDto {
  @ApiProperty()
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @Type(() => Number)
  @IsLongitude()
  longitude: number;
}

class RoutePreviewDto {
  @ApiProperty({ type: OriginDto })
  @ValidateNested()
  @Type(() => OriginDto)
  origin: OriginDto;

  @ApiProperty()
  @IsUUID()
  placeId: string;

  @ApiPropertyOptional({ enum: ['DRIVE', 'WALK'], default: 'DRIVE' })
  @IsOptional()
  @IsIn(['DRIVE', 'WALK'])
  travelMode?: 'DRIVE' | 'WALK';
}

/** Ortalama hızlar (km/s) — mock süre tahmini için */
const AVERAGE_SPEED = { DRIVE: 65, WALK: 4.5 };

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Rota önizleme (docs/01 §20, docs/04): başlangıç + hedef, mesafe, tahmini süre.
 * Google Routes API yalnızca kullanıcı rota istediğinde çağrılır (docs/02 §6);
 * anahtar yokken kuş uçuşu mesafeye dayalı tahmin döner.
 *
 * APPROXIMATE noktalarda rota, gerçek koordinata değil, public (bulanık) merkeze
 * kadar oluşturulur (docs/01 §12).
 */
@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  private readonly logger = new Logger(RoutesController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rota önizleme: mesafe + tahmini süre (misafir erişebilir)' })
  async preview(@Body() dto: RoutePreviewDto) {
    const place = await this.prisma.place.findFirst({
      where: { id: dto.placeId, publicationStatus: 'PUBLISHED' },
    });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const destination = {
      latitude: place.publicLatitude,
      longitude: place.publicLongitude,
    };
    const mode = dto.travelMode ?? 'DRIVE';
    const straightLine = haversineMeters(
      dto.origin.latitude,
      dto.origin.longitude,
      destination.latitude,
      destination.longitude,
    );

    const hasKey = !!this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (hasKey) {
      // Gerçek Google Routes çağrısı anahtar teslimi sonrasında buraya bağlanacak.
      this.logger.warn('GOOGLE_MAPS_API_KEY tanımlı ancak Routes entegrasyonu henüz bağlanmadı.');
    }

    // Karayolu mesafesi kuş uçuşundan uzundur; yaklaşık 1.3 katsayısı kullanılır
    const distanceMeters = Math.round(straightLine * (mode === 'DRIVE' ? 1.3 : 1.15));
    const durationSeconds = Math.round((distanceMeters / 1000 / AVERAGE_SPEED[mode]) * 3600);

    return {
      provider: hasKey ? 'GOOGLE_PENDING' : 'ESTIMATE',
      travelMode: mode,
      origin: dto.origin,
      destination,
      // Yaklaşık konumlu noktada hedef bulanık merkezdir
      destinationPrecision: place.locationPrecision,
      distanceMeters,
      estimatedDurationSeconds: durationSeconds,
      // Basit iki noktalı çizgi; gerçek polyline entegrasyonla gelecek
      polyline: [dto.origin, destination],
      externalMapsUrl:
        `https://www.google.com/maps/dir/?api=1&origin=${dto.origin.latitude},${dto.origin.longitude}` +
        `&destination=${destination.latitude},${destination.longitude}&travelmode=${mode === 'WALK' ? 'walking' : 'driving'}`,
    };
  }
}
