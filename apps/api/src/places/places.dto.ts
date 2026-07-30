import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const toBool = ({ value }: { value: unknown }) => value === 'true' || value === true;

export class ListPlacesQuery {
  /** "minLat,minLng,maxLat,maxLng" */
  @ApiPropertyOptional({ example: '36.0,26.0,42.5,45.0' })
  @IsOptional()
  @IsString()
  bounds?: string;

  @ApiPropertyOptional({ description: 'Ad / şehir / bölge metin araması' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Virgüllü liste: CARAVAN,TENT,PICNIC,BARBECUE' })
  @IsOptional()
  @Transform(toArray)
  activities?: string[];

  @ApiPropertyOptional({ description: 'Virgüllü imkân kodları: WC,SHOWER,...' })
  @IsOptional()
  @Transform(toArray)
  amenities?: string[];

  @ApiPropertyOptional({ description: 'Virgüllü etiketler: FIRE_ALLOWED,LAKESIDE,...' })
  @IsOptional()
  @Transform(toArray)
  tags?: string[];

  @ApiPropertyOptional({ enum: ['FREE', 'PAID'] })
  @IsOptional()
  @IsIn(['FREE', 'PAID'])
  feeType?: 'FREE' | 'PAID';

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ enum: ['OPEN', 'TEMPORARILY_CLOSED', 'SEASONAL'] })
  @IsOptional()
  @IsIn(['OPEN', 'TEMPORARILY_CLOSED', 'PERMANENTLY_CLOSED', 'SEASONAL'])
  operatingStatus?: string;

  @ApiPropertyOptional({ default: false, description: 'Kalıcı kapalı noktalar varsayılan gizli' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  includePermanentlyClosed?: boolean;

  @ApiPropertyOptional({ description: 'Mesafe filtresi için kullanıcı enlemi' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  nearLatitude?: number;

  @ApiPropertyOptional({ description: 'Mesafe filtresi için kullanıcı boylamı' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  nearLongitude?: number;

  @ApiPropertyOptional({ description: 'Maksimum mesafe (km); nearLatitude/Longitude ile' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  maxDistanceKm?: number;

  @ApiPropertyOptional({
    enum: ['tr', 'en'],
    description: 'İçerik dili; çeviri yoksa varsayılana düşer',
  })
  @IsOptional()
  @IsIn(['tr', 'en'])
  locale?: string;

  @ApiPropertyOptional({ enum: ['score', 'name', 'newest', 'distance'], default: 'score' })
  @IsOptional()
  @IsIn(['score', 'name', 'newest', 'distance'])
  sort?: 'score' | 'name' | 'newest' | 'distance';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 100, maximum: 200 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
