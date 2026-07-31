import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const ACTIVITY_CODES = ['CARAVAN', 'TENT', 'PICNIC', 'BARBECUE'];
const ROAD_TYPES = ['ASPHALT', 'NORMAL_CAR', 'HIGH_CLEARANCE', 'FOUR_BY_FOUR'];

class AccessInput {
  @ApiPropertyOptional({ enum: ROAD_TYPES })
  @IsOptional()
  @IsIn(ROAD_TYPES)
  roadType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  normalCar?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  highClearance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fourByFourRequired?: boolean;
}

class AtmosphereInput {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  cellSignal?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quietness?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  crowdLevel?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  privacy?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  nightCalm?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  socialLevel?: number;
}

export class CreatePlaceDto {
  @ApiProperty({ example: 'Gizli Koy Kamp Alanı' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 38.5 })
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 27.1 })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ enum: ['EXACT', 'APPROXIMATE'], default: 'EXACT' })
  @IsOptional()
  @IsIn(['EXACT', 'APPROXIMATE'])
  locationPrecision?: 'EXACT' | 'APPROXIMATE';

  @ApiProperty({ description: 'En az bir aktivite zorunlu', example: ['TENT'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ACTIVITY_CODES, { each: true })
  activities: string[];

  @ApiPropertyOptional({ enum: ['FREE', 'PAID', 'UNKNOWN'] })
  @IsOptional()
  @IsIn(['FREE', 'PAID', 'UNKNOWN'])
  feeType?: string;

  @ApiPropertyOptional({ example: ['WC', 'DRINKING_WATER'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: ['FOREST', 'QUIET'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @ApiPropertyOptional({ type: AccessInput })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AccessInput)
  access?: AccessInput;

  @ApiPropertyOptional({ type: AtmosphereInput })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AtmosphereInput)
  atmosphere?: AtmosphereInput;
}

export class CreateVerificationDto {
  @ApiProperty({ enum: ['PLACE', 'AMENITY', 'ACTIVITY'] })
  @IsIn(['PLACE', 'AMENITY', 'ACTIVITY'])
  targetType: 'PLACE' | 'AMENITY' | 'ACTIVITY';

  @ApiPropertyOptional({ description: 'AMENITY/ACTIVITY için kod (ör. WC, TENT)' })
  @IsOptional()
  @IsString()
  targetCode?: string;

  @ApiProperty({ enum: ['CONFIRMED', 'DISPUTED', 'CLOSED_REPORTED'] })
  @IsIn(['CONFIRMED', 'DISPUTED', 'CLOSED_REPORTED'])
  verdict: 'CONFIRMED' | 'DISPUTED' | 'CLOSED_REPORTED';
}

export class CreateChangeRequestDto {
  @ApiProperty({ example: 'AMENITY_UPDATE' })
  @IsString()
  @MaxLength(60)
  type: string;

  @ApiProperty({ description: 'Önerilen değişiklik içeriği (serbest JSON)' })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidenceText?: string;
}

export class CreateReportDto {
  @ApiProperty({
    enum: [
      'SPAM',
      'INCORRECT_INFO',
      'ABUSE',
      'INAPPROPRIATE_PHOTO',
      'FAKE_USER_OR_REVIEW',
      'SAFETY_RISK',
      'WRONG_LOCATION',
      'CLOSED_BUSINESS',
      'PROHIBITED_ACTIVITY',
      'OTHER',
    ],
  })
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class DuplicateCheckQuery {
  @ApiProperty()
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  excludeId?: string;
}
