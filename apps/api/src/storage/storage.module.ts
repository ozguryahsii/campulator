import { Module } from '@nestjs/common';
import { PhotosController } from './photos.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [PhotosController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
