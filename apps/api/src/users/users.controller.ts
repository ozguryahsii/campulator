import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { UpdateMeDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Oturum açmış kullanıcının profili' })
  getMe(@CurrentUser() user: AccessTokenPayload) {
    return this.users.getMe(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil güncelle' })
  updateMe(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.sub, dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Herkese açık profil (misafir erişebilir)' })
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getPublicProfile(id);
  }
}
