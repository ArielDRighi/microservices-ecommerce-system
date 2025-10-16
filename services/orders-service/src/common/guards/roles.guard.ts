import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard to validate user roles for endpoint access control
 *
 * This guard checks if the authenticated user has one of the required roles
 * specified via the @Roles() decorator on the endpoint.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * async adminOnlyEndpoint() {
 *   // Only users with ADMIN role can access
 * }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are defined, allow access (endpoint is public or only requires authentication)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // User must be authenticated (should be guaranteed by JwtAuthGuard)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has at least one of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `User with role '${user.role}' does not have access to this resource. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
