import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListPlacesQuery } from './places.dto';
import { PlacesService } from './places.service';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  @ApiOperation({ summary: 'Nokta listesi (bounds + filtreler; misafir erişebilir)' })
  list(@Query() query: ListPlacesQuery) {
    return this.places.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Nokta detayı (APPROXIMATE noktada gerçek koordinat dönmez)' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.places.getById(id);
  }
}
