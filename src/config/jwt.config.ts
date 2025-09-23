import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-in-production',
  signOptions: {
    expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
    issuer: process.env['JWT_ISSUER'] || 'ecommerce-async-system',
    audience: process.env['JWT_AUDIENCE'] || 'ecommerce-users',
    algorithm: 'HS256' as const,
  },
  refreshToken: {
    secret:
      process.env['JWT_REFRESH_SECRET'] || 'your-super-secret-refresh-key-change-in-production',
    expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
    issuer: process.env['JWT_ISSUER'] || 'ecommerce-async-system',
    audience: process.env['JWT_AUDIENCE'] || 'ecommerce-users',
    algorithm: 'HS256' as const,
  },
  verification: {
    secret:
      process.env['JWT_VERIFICATION_SECRET'] ||
      'your-super-secret-verification-key-change-in-production',
    expiresIn: process.env['JWT_VERIFICATION_EXPIRES_IN'] || '24h',
    issuer: process.env['JWT_ISSUER'] || 'ecommerce-async-system',
    audience: process.env['JWT_AUDIENCE'] || 'ecommerce-users',
    algorithm: 'HS256' as const,
  },
  resetPassword: {
    secret:
      process.env['JWT_RESET_PASSWORD_SECRET'] ||
      'your-super-secret-reset-password-key-change-in-production',
    expiresIn: process.env['JWT_RESET_PASSWORD_EXPIRES_IN'] || '1h',
    issuer: process.env['JWT_ISSUER'] || 'ecommerce-async-system',
    audience: process.env['JWT_AUDIENCE'] || 'ecommerce-users',
    algorithm: 'HS256' as const,
  },
}));
