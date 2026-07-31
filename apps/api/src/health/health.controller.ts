import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'API ve veritabanı sağlık durumu' })
  async check() {
    let database = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      // veritabanı erişilemez; database "down" olarak raporlanır
    }
    return {
      status: 'ok',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
