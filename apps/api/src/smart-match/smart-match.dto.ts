import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SmartMatchSearchDto {
  @ApiPropertyOptional({ description: 'Serbest metin (ad/şehir/bölge)' })
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiProperty({
    description: 'Kriter kimlikleri (eşit ağırlıklı)',
    example: ['activity:TENT', 'fee:FREE', 'amenity:WC', 'tag:LAKESIDE'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  criteria: string[];

  @ApiPropertyOptional({ description: '"minLat,minLng,maxLat,maxLng"' })
  @IsOptional()
  @IsString()
  bounds?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
