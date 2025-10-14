/**
 * User Role Enum
 *
 * Defines the available roles in the system for Role-Based Access Control (RBAC).
 *
 * @enum {string}
 */
export enum UserRole {
  /**
   * Administrator role with full system access
   * Can perform all operations including user management, product management, etc.
   */
  ADMIN = 'ADMIN',

  /**
   * Regular user role with limited access
   * Can access their own resources and perform customer operations
   */
  USER = 'USER',
}
