import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Dosya depolama soyutlaması (docs/02 §5). Geliştirmede LocalStorageProvider;
 * production'da S3/GCS sağlayıcıları aynı arayüzün arkasına eklenecek.
 */
@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  private get baseDir(): string {
    return this.config.get('STORAGE_LOCAL_DIR') ?? './storage';
  }

  validate(file: Express.Multer.File): void {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('PHOTO_MIME_NOT_ALLOWED');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('PHOTO_TOO_LARGE');
    }
  }

  upload(file: Express.Multer.File, prefix: string): string {
    this.validate(file);
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const key = `${prefix}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const fullPath = join(this.baseDir, key);
    mkdirSync(join(this.baseDir, prefix), { recursive: true });
    writeFileSync(fullPath, file.buffer);
    return key;
  }

  delete(storageKey: string): void {
    try {
      unlinkSync(join(this.baseDir, storageKey));
    } catch {
      // dosya zaten yoksa sessiz geç
    }
  }

  getPublicUrl(storageKey: string): string {
    return `/storage/${storageKey}`;
  }
}
