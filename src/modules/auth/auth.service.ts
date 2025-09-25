import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenSecret: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    this.refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-key';
    this.refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, phoneNumber } = registerDto;

    try {
      // Check if user already exists
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create new user
      const userData = {
        email,
        passwordHash: password, // Will be hashed by User entity
        firstName,
        lastName,
        phoneNumber,
        isActive: true,
      };

      const newUser = await this.usersService.create(userData);

      this.logger.log(`New user registered: ${email}`);

      // Generate tokens
      const tokens = await this.generateTokens(newUser);

      // Update last login
      await this.usersService.updateLastLogin(newUser.id);

      return {
        ...tokens,
        user: this.sanitizeUser(newUser),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Registration failed for email ${email}:`,
        error instanceof Error ? error.stack : error,
      );
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    try {
      // Find user by email
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is disabled. Please contact support.');
      }

      // Validate password
      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt for email: ${email}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      this.logger.log(`Successful login for user: ${email}`);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update last login
      await this.usersService.updateLastLogin(user.id);

      return {
        ...tokens,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Login failed for email ${email}:`,
        error instanceof Error ? error.stack : error,
      );
      throw new BadRequestException('Login failed. Please try again.');
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshTokenSecret,
      }) as JwtPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find user
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is disabled');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Token refresh failed:', error instanceof Error ? error.stack : error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user || !user.isActive) {
        return null;
      }

      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(
        `User validation failed for email ${email}:`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtSecret,
        expiresIn: this.jwtExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenExpiresIn,
      }),
    ]);

    // Extract expiration time in seconds
    const expiresIn = this.parseTimeToSeconds(this.jwtExpiresIn);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      language: user.language,
      timezone: user.timezone,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt || null,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      fullName: user.fullName,
    };
  }

  private parseTimeToSeconds(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600; // Default to 1 hour
    }
  }
}
