import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AccessTokenPayload, TokenService } from './token.service';

declare module 'express' {
  interface Request {
    user?: AccessTokenPayload;
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/** Access token zorunlu. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException('AUTH_TOKEN_MISSING');
    req.user = await this.tokens.verifyAccessToken(token);
    return true;
  }
}

/** Token varsa çözer, yoksa misafir olarak devam eder. */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(req);
    if (token) {
      try {
        req.user = await this.tokens.verifyAccessToken(token);
      } catch {
        // geçersiz token misafir gibi davranılır
      }
    }
    return true;
  }
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

const ROLE_HIERARCHY: Record<string, number> = {
  USER: 0,
  BUSINESS_OWNER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/** @Roles('ADMIN') gibi kullanımlar için; hiyerarşide üst roller alt rolleri kapsar. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<Request>();
    const role = req.user?.role;
    if (!role) throw new ForbiddenException('AUTH_ROLE_REQUIRED');
    const level = ROLE_HIERARCHY[role] ?? -1;
    const ok = required.some((r) => level >= (ROLE_HIERARCHY[r] ?? Number.MAX_SAFE_INTEGER));
    if (!ok) throw new ForbiddenException('AUTH_ROLE_INSUFFICIENT');
    return true;
  }
}

/**
 * Katkı işlemleri (yorum, puan, fotoğraf, nokta ekleme, doğrulama) için
 * doğrulanmış e-posta zorunludur (docs/01 §5).
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) throw new UnauthorizedException('AUTH_TOKEN_MISSING');
    if (!req.user.emailVerified) throw new ForbiddenException('AUTH_EMAIL_NOT_VERIFIED');
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPayload | undefined => {
    const req = context.switchToHttp().getRequest<Request>();
    return req.user;
  },
);
