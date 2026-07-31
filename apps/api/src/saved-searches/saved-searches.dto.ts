import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSavedSearchDto {
  @ApiProperty({ example: 'Göl kenarı ücretsiz çadır' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiProperty({ example: ['activity:TENT', 'fee:FREE', 'tag:LAKESIDE'] })
  @IsArray()
  @IsString({ each: true })
  criteria: string[];
}

export class UpdateSavedSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];
}
