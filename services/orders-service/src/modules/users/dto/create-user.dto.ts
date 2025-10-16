import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({
    description:
      'User password - must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    example: 'SecurePassword123!',
    type: String,
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()\-_=+\[\]{}|;:',.<>\/~`])[A-Za-z\d@$!%*?&^#()\-_=+\[\]{}|;:',.<>\/~`]+$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  passwordHash: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;

  @ApiProperty({
    description: 'User phone number (optional)',
    example: '+1234567890',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +1234567890)',
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'User date of birth (optional)',
    example: '1990-01-01',
    type: String,
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  dateOfBirth?: string;

  @ApiProperty({
    description: 'User preferred language (optional)',
    example: 'en',
    type: String,
    required: false,
    default: 'en',
  })
  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  @MaxLength(10, { message: 'Language code must not exceed 10 characters' })
  language?: string;

  @ApiProperty({
    description: 'User timezone (optional)',
    example: 'UTC',
    type: String,
    required: false,
    default: 'UTC',
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  timezone?: string;

  @ApiProperty({
    description: 'Whether the user account is active (optional)',
    example: true,
    type: Boolean,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;
}
