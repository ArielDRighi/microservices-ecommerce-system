import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'uuid-v4-string',
    type: String,
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  @Expose()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  @Expose()
  lastName: string;

  @ApiProperty({
    description: 'User full name (computed)',
    example: 'John Doe',
    type: String,
  })
  @Expose()
  fullName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    type: String,
    required: false,
  })
  @Expose()
  phoneNumber?: string;

  @ApiProperty({
    description: 'User date of birth',
    example: '1990-01-01',
    type: Date,
    required: false,
  })
  @Expose()
  dateOfBirth?: Date;

  @ApiProperty({
    description: 'User preferred language',
    example: 'en',
    type: String,
    required: false,
  })
  @Expose()
  language?: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'UTC',
    type: String,
    required: false,
  })
  @Expose()
  timezone?: string;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
    type: Boolean,
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Email verification timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
    required: false,
    nullable: true,
  })
  @Expose()
  emailVerifiedAt: Date | null;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
    required: false,
    nullable: true,
  })
  @Expose()
  lastLoginAt: Date | null;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  @Expose()
  updatedAt: Date;

  // Exclude sensitive data
  @Exclude()
  passwordHash: string;

  @Exclude()
  orders: unknown;
}
