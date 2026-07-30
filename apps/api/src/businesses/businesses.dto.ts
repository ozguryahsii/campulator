import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ClaimBusinessDto {
  @ApiProperty({ description: 'Sahiplik talep edilen nokta' })
  @IsUUID()
  placeId: string;

  @ApiProperty({ example: 'Çıralı Kamp İşletmesi' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({
    description: 'Sahipliği kanıtlayan açıklama/belge referansı (ilk sürümde manuel inceleme)',
    example: 'Vergi levhası no 1234567890, işletme ruhsatı ektedir.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  evidence: string;
}
