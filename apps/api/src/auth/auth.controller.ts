import { Body, Controller, Delete, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SocialLoginDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { CurrentUser, JwtAuthGuard } from './guards';
import { AccessTokenPayload, TokenService } from './token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'E-posta ile kayıt (zorunlu yasal onaylarla)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'E-posta + şifre ile giriş' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Google ile giriş (anahtar yoksa dev stub)' })
  google(@Body() dto: SocialLoginDto) {
    return this.auth.socialLogin('GOOGLE', dto);
  }

  @Post('apple')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apple ile giriş (anahtar yoksa dev stub)' })
  apple(@Body() dto: SocialLoginDto) {
    return this.auth.socialLogin('APPLE', dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: "E-posta doğrulama token'ını kullan" })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Doğrulama e-postasını yeniden gönder' })
  resend(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh token rotasyonu ile yeni token çifti' })
  refresh(@Body() dto: RefreshDto) {
    return this.tokens.rotate(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: "Refresh token'ı iptal et" })
  async logout(@Body() dto: LogoutDto) {
    await this.tokens.revoke(dto.refreshToken);
    return { loggedOut: true };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Şifre sıfırlama e-postası gönder' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Token ile yeni şifre belirle (tüm oturumlar kapanır)' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Şifre değiştir (tüm oturumlar kapanır)' })
  changePassword(@CurrentUser() user: AccessTokenPayload, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hesabı sil (kamusal katkılar anonimleşir)' })
  async deleteAccount(@CurrentUser() user: AccessTokenPayload) {
    await this.tokens.revokeAllForUser(user.sub);
    return this.auth.deleteAccount(user.sub);
  }
}
