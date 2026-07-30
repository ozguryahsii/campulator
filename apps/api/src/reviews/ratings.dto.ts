import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

// Puanlar tam yıldız 1–5 (docs/01 §10.2)

export class UpsertRatingDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  cleanliness: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  safety: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  scenery: number;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Ulaşım' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  accessibility: number;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Fiyat/performans' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  valueForMoney: number;

  @ApiPropertyOptional({ description: 'Ziyaret tarihi (isteğe bağlı)' })
  @IsOptional()
  @IsDateString()
  visitDate?: string;
}
