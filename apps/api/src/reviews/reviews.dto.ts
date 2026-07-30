import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minLength: 5, maxLength: 3000 })
  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  visitDate?: string;
}

export class UpdateReviewDto {
  @ApiProperty({ minLength: 5, maxLength: 3000 })
  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  body: string;
}

export class CreateReplyDto {
  @ApiProperty({ minLength: 2, maxLength: 1000 })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  body: string;
}

export class ReportReviewDto {
  @ApiProperty()
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class ListReviewsQuery {
  @ApiPropertyOptional({
    enum: ['newest', 'helpful', 'highest', 'lowest', 'with_photos'],
    default: 'newest',
  })
  @IsOptional()
  @IsIn(['newest', 'helpful', 'highest', 'lowest', 'with_photos'])
  sort?: 'newest' | 'helpful' | 'highest' | 'lowest' | 'with_photos';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  pageSize?: number;
}
