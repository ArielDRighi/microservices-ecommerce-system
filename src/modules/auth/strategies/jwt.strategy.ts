import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { sub, email, type } = payload;

    // Only allow access tokens for authentication
    if (type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Find user by ID
    const user = await this.usersService.findById(sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    // Verify email matches
    if (user.email !== email) {
      throw new UnauthorizedException('Token email mismatch');
    }

    return user;
  }
}
