import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn(`Unauthorized access attempt from ${request.ip}`);
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // Add user information to request object
      request['user'] = payload;

      this.logger.debug(`User ${payload.sub} authenticated successfully`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'UnknownError';

      this.logger.warn(`Invalid token attempt from ${request.ip}: ${errorMessage}`);

      if (errorName === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (errorName === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      } else {
        throw new UnauthorizedException('Token verification failed');
      }
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
