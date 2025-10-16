import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/enums/user-role.enum';

/**
 * Metadata key for storing required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for endpoint access
 *
 * Use this decorator in combination with RolesGuard to restrict
 * endpoint access to users with specific roles.
 *
 * @param roles - One or more UserRole values required to access the endpoint
 *
 * @example
 * ```typescript
 * @Post()
 * @Roles(UserRole.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async createUser(@Body() dto: CreateUserDto) {
 *   // Only admins can access
 * }
 * ```
 *
 * @example Multiple roles
 * ```typescript
 * @Get()
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async getUsers() {
 *   // Admins or moderators can access
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
