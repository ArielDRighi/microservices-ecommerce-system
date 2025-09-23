import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/**
 * Decorator to mark routes as public (no authentication required)
 * Usage: @Public() above controller methods or classes
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
