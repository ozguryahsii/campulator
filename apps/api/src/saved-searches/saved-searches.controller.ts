import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AccessTokenPayload } from '../auth/token.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './saved-searches.dto';
import { SavedSearchesService } from './saved-searches.service';

@ApiTags('saved-searches')
@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedSearchesController {
  constructor(private readonly savedSearches: SavedSearchesService) {}

  @Get()
  @ApiOperation({ summary: 'Kayıtlı aramalarım' })
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.savedSearches.list(user.sub);
  }

  @Get('history')
  @ApiOperation({ summary: 'Son aramalarım' })
  history(@CurrentUser() user: AccessTokenPayload) {
    return this.savedSearches.history(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Arama kaydet' })
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateSavedSearchDto) {
    return this.savedSearches.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kayıtlı aramayı güncelle' })
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.savedSearches.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Kayıtlı aramayı sil' })
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.savedSearches.remove(user.sub, id);
  }

  @Post(':id/run')
  @HttpCode(200)
  @ApiOperation({ summary: 'Kayıtlı aramayı çalıştır (Smart Match)' })
  run(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.savedSearches.run(user.sub, id);
  }
}
