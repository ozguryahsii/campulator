import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { NotificationsService } from './notifications.service';

class ListQuery {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  pageSize?: number;
}

class RegisterDeviceDto {
  @ApiProperty({ enum: ['IOS', 'ANDROID'] })
  @IsIn(['IOS', 'ANDROID'])
  platform: 'IOS' | 'ANDROID';

  @ApiProperty()
  @IsString()
  fcmToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

class PreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'E-posta bildirimleri (sonraki faz)' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;
}

@ApiTags('notifications')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Bildirim merkezi (okunmamış sayısıyla)' })
  list(@CurrentUser() user: AccessTokenPayload, @Query() query: ListQuery) {
    return this.notifications.list(
      user.sub,
      query.unreadOnly ?? false,
      query.page ?? 1,
      query.pageSize ?? 30,
    );
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Tümünü okundu işaretle' })
  markAllRead(@CurrentUser() user: AccessTokenPayload) {
    return this.notifications.markAllRead(user.sub);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Bildirimi okundu işaretle' })
  markRead(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(user.sub, id);
  }

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'Bildirim tercihleri' })
  getPreferences(@CurrentUser() user: AccessTokenPayload) {
    return this.notifications.getPreferences(user.sub);
  }

  @Patch('notifications/preferences')
  @ApiOperation({ summary: 'Bildirim tercihlerini güncelle' })
  updatePreferences(@CurrentUser() user: AccessTokenPayload, @Body() dto: PreferencesDto) {
    return this.notifications.updatePreferences(user.sub, dto);
  }

  @Post('devices/fcm-token')
  @ApiOperation({ summary: 'Cihaz push token kaydı (çoklu cihaz desteklenir)' })
  registerDevice(@CurrentUser() user: AccessTokenPayload, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(user.sub, dto);
  }

  @Delete('devices/fcm-token/:id')
  @ApiOperation({ summary: 'Cihaz token iptali' })
  revokeDevice(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.revokeDevice(user.sub, id);
  }
}
