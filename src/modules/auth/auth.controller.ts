import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, AuthResponseDto, MessageResponseDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, Public } from './decorators';
import { User } from '../users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with email, password, and personal information',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      completeRegistration: {
        summary: 'Complete registration with phone',
        description: 'Full registration with all fields including optional phone number',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+1234567890',
        },
      },
      basicRegistration: {
        summary: 'Basic registration',
        description: 'Minimal registration with required fields only',
        value: {
          email: 'jane.smith@example.com',
          password: 'MySecurePass456@',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or registration failed',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      userLogin: {
        summary: 'Standard user login',
        description: 'Example login with email and password',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePassword123!',
        },
      },
      alternativeUser: {
        summary: 'Alternative user login',
        description: 'Another example with different credentials',
        value: {
          email: 'jane.smith@example.com',
          password: 'MySecurePass456@',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or account disabled',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or login failed',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate new access token using refresh token',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token from previous login/register',
    examples: {
      refreshToken: {
        summary: 'Refresh access token',
        description:
          'Use the refresh token obtained from login or register to get a new access token',
        value: {
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDE2MDAwMDB9.example_signature_here',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token generated',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    this.logger.log('Token refresh attempt');
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile information of the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getProfile(@CurrentUser() user: User) {
    this.logger.log(`Profile access for user: ${user.email}`);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      language: user.language,
      timezone: user.timezone,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout the authenticated user (client should discard tokens)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async logout(@CurrentUser() user: User): Promise<MessageResponseDto> {
    this.logger.log(`Logout for user: ${user.email}`);
    return {
      message: 'Successfully logged out. Please discard your tokens.',
      success: true,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user information',
    description: 'Get minimal information about the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User information retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      isActive: user.isActive,
    };
  }
}
