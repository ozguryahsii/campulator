import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const REQUIRED_CONSENTS = ['TERMS_OF_USE', 'PRIVACY_POLICY', 'COMMUNITY_RULES'] as const;

export class RegisterDto {
  @ApiProperty({ example: 'kampci@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'gizliSifre123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'Kampçı Ali' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName: string;

  @ApiPropertyOptional({ enum: ['tr', 'en'], default: 'tr' })
  @IsOptional()
  @IsIn(['tr', 'en'])
  locale?: string;

  @ApiProperty({
    description: `Zorunlu onaylar: ${REQUIRED_CONSENTS.join(', ')}`,
    example: REQUIRED_CONSENTS,
  })
  @IsArray()
  @IsString({ each: true })
  acceptedConsents: string[];

  @ApiPropertyOptional({ description: 'Pazarlama iletişimi (isteğe bağlı)', default: false })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Cihaz kimliği (oturum listesi için)' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SocialLoginDto {
  @ApiProperty({
    description:
      'Sağlayıcı ID token. Anahtar yapılandırılmamışsa dev stub: "dev:<email>:<Ad Soyad>"',
  })
  @IsString()
  idToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export { REQUIRED_CONSENTS };

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mevcut şifre' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8, description: 'Yeni şifre' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'kampci@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "E-postadaki sıfırlama token'ı" })
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
