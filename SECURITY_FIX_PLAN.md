# 🔒 Plan de Corrección de Seguridad y Mejoras

**Fecha de Creación:** 13 de Octubre, 2025  
**Versión:** 1.0  
**Branch de Trabajo:** `fix/security-and-authorization`  
**Prioridad:** 🔴 **CRÍTICA - BLOQUEANTE PARA PRODUCCIÓN**

---

## 📊 Resumen Ejecutivo

Análisis post-testing revela **22 problemas** que comprometen la seguridad e integridad del sistema:

- **17 Críticos (77%)** - Vulnerabilidades de seguridad y autorización
- **4 Medios (18%)** - Implementaciones incorrectas
- **1 Bajo (5%)** - Mejoras de UX

### 🎯 Objetivo del Plan

Resolver los **17 problemas críticos** de seguridad antes de cualquier despliegue a producción, implementando:

1. Sistema de Roles (RBAC - Role-Based Access Control)
2. Guards de Autorización en todos los endpoints administrativos
3. Rate Limiting y protección contra fuerza bruta
4. Autenticación para dashboards administrativos
5. Implementación correcta de Soft Delete

---

## 🏗️ Estructura del Plan

El plan se divide en **6 FASES** con **26 tareas** específicas:

| Fase       | Nombre                                       | Tareas | Duración Estimada | Prioridad  |
| ---------- | -------------------------------------------- | ------ | ----------------- | ---------- |
| **Fase 1** | Sistema de Roles Base                        | 4      | 4-5 horas         | 🔴 CRÍTICA |
| **Fase 2** | Protección de Endpoints - Users              | 5      | 3-4 horas         | 🔴 CRÍTICA |
| **Fase 3** | Protección de Endpoints - Products/Inventory | 6      | 4-5 horas         | 🔴 CRÍTICA |
| **Fase 4** | Protección de Endpoints - Categories         | 5      | 3-4 horas         | 🔴 CRÍTICA |
| **Fase 5** | Seguridad Adicional                          | 3      | 3-4 horas         | 🟡 ALTA    |
| **Fase 6** | Correcciones Medias y Testing                | 3      | 2-3 horas         | 🟢 MEDIA   |

**Total Estimado:** 19-25 horas de desarrollo

---

## 📋 FASE 1: Sistema de Roles Base (CRÍTICA)

### 🎯 Objetivo

Implementar infraestructura completa de RBAC (Role-Based Access Control) con roles ADMIN/USER.

### 🔧 Tareas

#### 1.1 - Agregar Campo `role` a Entidad User

**Archivos Afectados:**

- `src/modules/users/entities/user.entity.ts`

**Implementación:**

```typescript
// src/modules/users/entities/user.entity.ts
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  // ... campos existentes ...

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  // ... resto de la entidad ...
}
```

**Validaciones:**

- ✅ Ejecutar `npm run lint`
- ✅ Ejecutar `npm run type-check`
- ✅ Verificar que entidad compile sin errores

---

#### 1.2 - Crear Enum de Roles

**Archivos Afectados:**

- `src/modules/users/enums/user-role.enum.ts` (NUEVO)

**Implementación:**

```typescript
// src/modules/users/enums/user-role.enum.ts
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
```

**Validaciones:**

- ✅ Verificar que enum se exporte correctamente
- ✅ Actualizar `index.ts` de exportación si existe

---

#### 1.3 - Crear Migración para Campo `role`

**Comando:**

```bash
npm run migration:create -- -n AddRoleToUsers
```

**Archivos Afectados:**

- `src/database/migrations/XXXXXX-AddRoleToUsers.ts` (GENERADO)

**Implementación:**

```typescript
// src/database/migrations/XXXXXX-AddRoleToUsers.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRoleToUsers1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tipo enum
    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'USER');
    `);

    // 2. Agregar columna con default USER
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'role',
        type: 'user_role_enum',
        default: "'USER'",
        isNullable: false,
      }),
    );

    // 3. Actualizar usuario admin@test.com a ADMIN
    await queryRunner.query(`
      UPDATE users 
      SET role = 'ADMIN' 
      WHERE email = 'admin@test.com';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'role');
    await queryRunner.query(`DROP TYPE user_role_enum;`);
  }
}
```

**Validaciones:**

- ✅ Ejecutar `npm run migration:run` en entorno de desarrollo
- ✅ Verificar que columna `role` exista en tabla `users`
- ✅ Verificar que admin@test.com tenga role='ADMIN'
- ✅ Ejecutar `npm run migration:revert` para testing de rollback

---

#### 1.4 - Implementar RolesGuard y Decorador @Roles()

**Archivos Afectados:**

- `src/common/guards/roles.guard.ts` (NUEVO)
- `src/common/decorators/roles.decorator.ts` (NUEVO)

**Implementación del Guard:**

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles definidos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Usuario debe estar autenticado
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `User with role '${user.role}' does not have access to this resource. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

**Implementación del Decorador:**

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

**Validaciones:**

- ✅ Ejecutar `npm run lint`
- ✅ Ejecutar `npm run type-check`
- ✅ Crear test unitario de `RolesGuard`:
  - Caso: Sin roles definidos → debe permitir acceso
  - Caso: Usuario con role correcto → debe permitir acceso
  - Caso: Usuario sin role correcto → debe denegar con 403
  - Caso: Usuario no autenticado → debe denegar con 403

**Test Unitario:**

```typescript
// src/common/guards/roles.guard.spec.ts
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../modules/users/enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are defined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockExecutionContext({ role: UserRole.USER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext({ role: UserRole.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext({ role: UserRole.USER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user is not authenticated', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

function createMockExecutionContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}
```

---

### ✅ Validaciones de Fase 1

**Checklist de Completitud:**

- [ ] Entidad User tiene campo `role` con enum UserRole
- [ ] Migración ejecutada exitosamente
- [ ] Usuario admin@test.com tiene role='ADMIN'
- [ ] RolesGuard implementado y testeado
- [ ] Decorador @Roles() implementado
- [ ] Tests unitarios pasan con coverage >80%
- [ ] Linting y type-checking pasan sin errores
- [ ] Build de producción exitoso

**Comando de Validación Final:**

```bash
# 1. Verificar compilación
npm run build

# 2. Verificar tests
npm run test -- roles.guard.spec.ts

# 3. Verificar migración
npm run migration:run

# 4. Verificar estructura de DB
docker exec ecommerce-postgres psql -U postgres -d ecommerce_async -c "\d users"
```

---

## 📋 FASE 2: Protección de Endpoints - Users Module (CRÍTICA)

### 🎯 Objetivo

Proteger todos los endpoints administrativos del módulo Users con autorización ADMIN.

### 🔧 Tareas

#### 2.1 - Proteger POST /users (Creación de Usuarios)

**Problema:** [USERS-002] - Usuario puede crear cuentas arbitrariamente

**Archivos Afectados:**

- `src/modules/users/users.controller.ts`

**Implementación:**

```typescript
// src/modules/users/users.controller.ts
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from './enums/user-role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard) // Ya existe
export class UsersController {
  @Post()
  @Roles(UserRole.ADMIN) // ← NUEVO
  @UseGuards(RolesGuard) // ← NUEVO
  @ApiOperation({
    summary: 'Create new user (Admin only)',
    description:
      'Only administrators can create new users through this endpoint. Regular users should use /auth/register',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // ... resto de endpoints ...
}
```

**Validaciones:**

- ✅ Test E2E: Usuario normal (USER) recibe 403 Forbidden
- ✅ Test E2E: Usuario ADMIN puede crear usuarios
- ✅ Test E2E: Sin token JWT recibe 401 Unauthorized
- ✅ Documentación Swagger actualizada con nota "Admin only"

**Test E2E:**

```typescript
// test/e2e/users.e2e-spec.ts
describe('POST /users (create user)', () => {
  it('should deny access to normal users', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${normalUserToken}`)
      .send({ email: 'test@test.com', password: 'Password123!' })
      .expect(403);

    expect(response.body.message).toContain('does not have access');
  });

  it('should allow access to admin users', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newuser@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);
  });
});
```

---

#### 2.2 - Proteger GET /users (Listar Todos los Usuarios)

**Problema:** [USERS-003] - Exposición de datos de todos los usuarios

**Implementación:**

```typescript
@Get()
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'List all users (Admin only)',
  description: 'Only administrators can view list of all users. Regular users should use /users/profile'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async findAll(@Query() query: QueryUsersDto) {
  return this.usersService.findAll(query);
}
```

**Validaciones:**

- ✅ Usuario normal recibe 403
- ✅ Usuario ADMIN puede listar usuarios
- ✅ Verificar que datos sensibles no se expongan (passwordHash oculto)

---

#### 2.3 - Proteger PATCH /users/:id (Actualizar Usuario)

**Problema:** [USERS-005] - Usuario puede modificar datos de otros

**Implementación:**

```typescript
@Patch(':id')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Update user (Admin only)',
  description: 'Only administrators can update any user. Regular users should use /users/profile'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async update(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() updateUserDto: UpdateUserDto,
) {
  return this.usersService.update(id, updateUserDto);
}
```

**Validaciones:**

- ✅ Usuario normal no puede actualizar otros usuarios
- ✅ Usuario ADMIN puede actualizar cualquier usuario
- ✅ Admin no puede cambiar su propio role a USER (validar en service)

---

#### 2.4 - Proteger DELETE /users/:id (Eliminar Usuario)

**Problema:** [USERS-004] - Usuario puede eliminar otros usuarios

**Implementación:**

```typescript
@Delete(':id')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Delete user (Admin only)',
  description: 'Soft delete user. Only administrators can delete users.'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async remove(@Param('id', ParseUUIDPipe) id: string) {
  return this.usersService.remove(id);
}
```

**Validaciones:**

- ✅ Usuario normal no puede eliminar usuarios
- ✅ Usuario ADMIN puede eliminar usuarios
- ✅ Admin no puede eliminarse a sí mismo (implementar en FASE 6)

---

#### 2.5 - Proteger PATCH /users/:id/activate (Activar Usuario)

**Problema:** Usuario normal puede activar cuentas desactivadas

**Implementación:**

```typescript
@Patch(':id/activate')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Activate user account (Admin only)' })
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async activate(@Param('id', ParseUUIDPipe) id: string) {
  return this.usersService.activate(id);
}
```

---

### ✅ Validaciones de Fase 2

**Checklist de Completitud:**

- [ ] Todos los endpoints de Users tienen `@Roles(UserRole.ADMIN)` excepto `/users/profile`
- [ ] Tests E2E pasan para cada endpoint (403 para USER, 201/200 para ADMIN)
- [ ] Documentación Swagger actualizada con notas "Admin only"
- [ ] Coverage de tests >80% en users.controller.spec.ts

**Comando de Validación:**

```bash
npm run test:e2e -- users
```

---

## 📋 FASE 3: Protección de Endpoints - Products & Inventory (CRÍTICA)

### 🎯 Objetivo

Proteger endpoints administrativos de Products e Inventory para prevenir manipulación de catálogo y stock.

### 🔧 Tareas

#### 3.1 - Proteger POST /products (Crear Producto)

**Problema:** [PRODUCTS-001] - Usuario puede crear productos falsos

**Archivos Afectados:**

- `src/modules/products/products.controller.ts`

**Implementación:**

```typescript
@Post()
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Create new product (Admin only)',
  description: 'Only administrators can create products in the catalog'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async create(@Body() createProductDto: CreateProductDto) {
  return this.productsService.create(createProductDto);
}
```

**Validaciones:**

- ✅ Usuario normal recibe 403
- ✅ Usuario ADMIN puede crear productos
- ✅ Validar precio mínimo en DTO (ej: $0.50)

---

#### 3.2 - Proteger PATCH /products/:id (Actualizar Producto)

**Problema:** [PRODUCTS-002] - Usuario puede modificar precios

**Implementación:**

```typescript
@Patch(':id')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Update product (Admin only)',
  description: 'Only administrators can modify products. Price changes are logged for audit.'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async update(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() updateProductDto: UpdateProductDto,
) {
  return this.productsService.update(id, updateProductDto);
}
```

**Validaciones:**

- ✅ Usuario normal no puede actualizar productos
- ✅ Usuario ADMIN puede actualizar productos
- ✅ Cambios de precio se loguean (implementar en service)

---

#### 3.3 - Proteger DELETE /products/:id (Eliminar Producto)

**Problema:** [PRODUCTS-003] - Usuario puede eliminar productos

**Implementación:**

```typescript
@Delete(':id')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Delete product (Admin only)',
  description: 'Soft delete product. Validates no pending orders exist for this product.'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async remove(@Param('id', ParseUUIDPipe) id: string) {
  return this.productsService.remove(id);
}
```

---

#### 3.4 - Proteger POST /inventory/add-stock (Agregar Stock)

**Problema:** [INVENTORY-001] - Usuario puede agregar stock ilimitado

**Archivos Afectados:**

- `src/modules/inventory/inventory.controller.ts`

**Implementación:**

```typescript
@Post('add-stock')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Add stock to inventory (Admin only)',
  description: 'Only administrators and warehouse staff can modify inventory stock'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async addStock(@Body() addStockDto: AddStockDto) {
  return this.inventoryService.addStock(addStockDto);
}
```

**Validaciones:**

- ✅ Usuario normal recibe 403
- ✅ Usuario ADMIN puede agregar stock
- ✅ Validar límite máximo por movimiento (ej: max 1000 unidades)

---

#### 3.5 - Proteger POST /inventory/reduce-stock (Reducir Stock)

**Problema:** [INVENTORY-002] - Usuario puede reducir stock artificialmente

**Implementación:**

```typescript
@Post('reduce-stock')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Reduce stock (Admin only)',
  description: 'Reduce inventory for damage, shrinkage, or other reasons. Admin only.'
})
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async reduceStock(@Body() reduceStockDto: ReduceStockDto) {
  return this.inventoryService.reduceStock(reduceStockDto);
}
```

---

#### 3.6 - Validar Precio Mínimo en CreateProductDto

**Archivos Afectados:**

- `src/modules/products/dto/create-product.dto.ts`

**Implementación:**

```typescript
import { IsPositive, Min } from 'class-validator';

export class CreateProductDto {
  // ... otros campos ...

  @IsNumber()
  @IsPositive()
  @Min(0.5, { message: 'Price must be at least $0.50' })
  @ApiProperty({
    minimum: 0.5,
    description: 'Product price (minimum $0.50)',
    example: 99.99,
  })
  price: number;
}
```

**Validaciones:**

- ✅ Precio <$0.50 retorna 400 Bad Request
- ✅ Test unitario de validación en DTO

---

### ✅ Validaciones de Fase 3

**Checklist de Completitud:**

- [ ] Endpoints de Products protegidos con @Roles(ADMIN)
- [ ] Endpoints de Inventory protegidos con @Roles(ADMIN)
- [ ] Validación de precio mínimo implementada
- [ ] Tests E2E pasan (403 para USER, éxito para ADMIN)
- [ ] Logs de cambios de precio implementados

**Comando de Validación:**

```bash
npm run test:e2e -- products
npm run test:e2e -- inventory
```

---

## 📋 FASE 4: Protección de Endpoints - Categories (CRÍTICA)

### 🎯 Objetivo

Proteger todos los endpoints administrativos del módulo Categories.

### 🔧 Tareas

#### 4.1 - Proteger POST /categories (Crear Categoría)

**Problema:** [CATEGORIES-001] - Usuario puede crear categorías

**Archivos Afectados:**

- `src/modules/categories/categories.controller.ts`

**Implementación:**

```typescript
@Post()
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Create category (Admin only)' })
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async create(@Body() createCategoryDto: CreateCategoryDto) {
  return this.categoriesService.create(createCategoryDto);
}
```

---

#### 4.2 - Proteger PUT /categories/:id (Actualizar Categoría)

**Problema:** [CATEGORIES-002] - Usuario puede modificar categorías

**Implementación:**

```typescript
@Put(':id')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Update category (Admin only)' })
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
async update(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() updateCategoryDto: UpdateCategoryDto,
) {
  return this.categoriesService.update(id, updateCategoryDto);
}
```

---

#### 4.3 - Proteger PATCH /categories/:id/activate & deactivate

**Problemas:** [CATEGORIES-003] y [CATEGORIES-004]

**Implementación:**

```typescript
@Patch(':id/activate')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Activate category (Admin only)' })
async activate(@Param('id', ParseUUIDPipe) id: string) {
  return this.categoriesService.activate(id);
}

@Patch(':id/deactivate')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Deactivate category (Admin only)' })
async deactivate(@Param('id', ParseUUIDPipe) id: string) {
  return this.categoriesService.deactivate(id);
}
```

---

#### 4.4 - Proteger DELETE /categories/:id (Eliminar Categoría)

**Problema:** [CATEGORIES-005] - Usuario puede eliminar categorías

**Implementación:**

```typescript
@Delete(':id')
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({
  summary: 'Delete category (Admin only)',
  description: 'Soft delete category. Validates that category has no products.'
})
async remove(@Param('id', ParseUUIDPipe) id: string) {
  return this.categoriesService.remove(id);
}
```

---

#### 4.5 - Implementar Soft Delete con @DeleteDateColumn

**Problema:** Eliminación es hard delete, no soft delete

**Archivos Afectados:**

- `src/modules/categories/entities/category.entity.ts`
- `src/modules/categories/categories.service.ts`

**Implementación en Entidad:**

```typescript
import { DeleteDateColumn } from 'typeorm';

@Entity('categories')
export class Category {
  // ... campos existentes ...

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
```

**Migración:**

```bash
npm run migration:create -- -n AddDeletedAtToCategories
```

```typescript
export class AddDeletedAtToCategories1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'categories',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('categories', 'deleted_at');
  }
}
```

**Implementación en Service:**

```typescript
async remove(id: string): Promise<void> {
  const category = await this.findOne(id);

  // Validar que no tenga productos
  const productCount = await this.productsRepository.count({
    where: { categoryId: id }
  });

  if (productCount > 0) {
    throw new ConflictException(
      `Cannot delete category with ${productCount} products. Please reassign products first.`
    );
  }

  // Soft delete
  await this.categoryRepository.softDelete(id);
}
```

---

### ✅ Validaciones de Fase 4

**Checklist de Completitud:**

- [ ] Todos los endpoints de modificación protegidos con @Roles(ADMIN)
- [ ] Soft delete implementado con deletedAt
- [ ] Validación de productos antes de eliminar categoría
- [ ] Tests E2E pasan (403 para USER, éxito para ADMIN)

---

## 📋 FASE 5: Seguridad Adicional (ALTA PRIORIDAD)

### 🎯 Objetivo

Implementar medidas de seguridad adicionales: Rate Limiting, protección de Bull Board, corrección de validaciones de login.

### 🔧 Tareas

#### 5.1 - Implementar Rate Limiting con @nestjs/throttler

**Problema:** [AUTH-002] - No hay rate limiting (vulnerable a fuerza bruta)

**Instalación:**

```bash
npm install @nestjs/throttler
```

**Archivos Afectados:**

- `src/app.module.ts`
- `src/modules/auth/auth.controller.ts`

**Implementación en AppModule:**

```typescript
// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000, // 60 segundos
          limit: 10, // 10 requests por minuto (general)
        },
      ],
    }),
    // ... otros módulos
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**Implementación en AuthController:**

```typescript
// src/modules/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 registros por hora
  @ApiOperation({ summary: 'User registration' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
```

**Validaciones:**

- ✅ Test E2E: 6to intento de login recibe 429 Too Many Requests
- ✅ Test E2E: 4to registro recibe 429
- ✅ Verificar que límites se resetean después de TTL

---

#### 5.2 - Proteger Bull Board Dashboard con Autenticación

**Problema:** [HEALTH-001] - Bull Board Dashboard sin autenticación

**Archivos Afectados:**

- `src/main.ts`

**Implementación con Basic Auth:**

```typescript
// src/main.ts
import * as basicAuth from 'express-basic-auth';

async function bootstrap() {
  // ... configuración inicial ...

  // Setup Bull Board Dashboard CON AUTENTICACIÓN
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/api/v1/admin/queues');

    // ... configuración de queues ...

    // AGREGAR BASIC AUTH
    const bullBoardUsername = configService.get<string>('BULL_BOARD_USERNAME', 'admin');
    const bullBoardPassword = configService.get<string>('BULL_BOARD_PASSWORD', 'changeme');

    app.use(
      '/api/v1/admin/queues',
      basicAuth({
        users: { [bullBoardUsername]: bullBoardPassword },
        challenge: true,
        realm: 'Bull Board Dashboard',
      }),
    );

    app.use('/api/v1/admin/queues', serverAdapter.getRouter());

    logger.log(
      `📊 Bull Board dashboard available at: http://localhost:${port}/api/v1/admin/queues`,
    );
    logger.warn('⚠️  Bull Board protected with Basic Auth (username from env)');
  } catch (error) {
    logger.warn('⚠️  Could not setup Bull Board dashboard:', (error as Error).message);
  }
}
```

**Variables de Entorno:**

```bash
# .env
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=SuperSecurePassword123!
```

**Validaciones:**

- ✅ Acceso sin credenciales recibe 401 Unauthorized
- ✅ Acceso con credenciales correctas permite acceso
- ✅ Credenciales incorrectas recibe 401
- ✅ Dashboard solo habilitado si NODE_ENV !== 'production' (opcional)

---

#### 5.3 - Corregir Validaciones de LoginDto

**Problema:** [AUTH-001] - Revelación de políticas de contraseña en login

**Archivos Afectados:**

- `src/modules/auth/dto/login.dto.ts`

**Implementación INCORRECTA (actual):**

```typescript
// ❌ INCORRECTO - Valida formato en login
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/regex/)
  password: string; // ← NO validar formato en login
}
```

**Implementación CORRECTA:**

```typescript
// ✅ CORRECTO - Solo valida presencia en login
export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password123' })
  password: string; // Solo valida que no esté vacío
}
```

**Explicación:**

- El login NO debe validar formato de contraseña
- Solo debe comparar el hash almacenado con el hash de la contraseña ingresada
- Las validaciones de formato son para REGISTRO, no para LOGIN
- Evita revelar políticas de contraseña a atacantes

**Validaciones:**

- ✅ Login con contraseña corta no retorna mensaje de validación
- ✅ Login con credenciales inválidas retorna mensaje genérico: "Invalid email or password"
- ✅ Validaciones de formato siguen en RegisterDto

---

### ✅ Validaciones de Fase 5

**Checklist de Completitud:**

- [x] Rate limiting implementado en Auth endpoints
- [x] Bull Board protegido con Basic Auth
- [x] LoginDto solo valida presencia de campos (no formato)
- [x] Tests E2E pasan para rate limiting
- [x] Variables de entorno documentadas en .env.example

---

## 📋 FASE 6: Correcciones Medias y Testing Final (MEDIA PRIORIDAD)

### 🎯 Objetivo

Resolver problemas de severidad media y ejecutar suite completa de tests.

### 🔧 Tareas

#### 6.1 - Implementar Soft Delete Correcto en Users

**Problema:** [USERS-006] - Soft delete no usa deletedAt

**Archivos Afectados:**

- `src/modules/users/entities/user.entity.ts`
- `src/modules/users/users.service.ts`

**Implementación:**

```typescript
// src/modules/users/entities/user.entity.ts
import { DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  // ... campos existentes ...

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
```

**Migración:**

```bash
npm run migration:create -- -n AddDeletedAtToUsers
```

```typescript
export class AddDeletedAtToUsers1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'deleted_at');
  }
}
```

**Service:**

```typescript
// src/modules/users/users.service.ts
async remove(id: string): Promise<void> {
  const user = await this.findOne(id);

  // Prevenir que admin se elimine a sí mismo
  if (user.role === UserRole.ADMIN) {
    throw new ForbiddenException('Admin users cannot delete themselves');
  }

  // Soft delete usando TypeORM
  await this.userRepository.softDelete(id);
}
```

**Validaciones:**

- ✅ Campo deletedAt se setea al eliminar
- ✅ Usuario eliminado no aparece en consultas (WHERE deleted_at IS NULL)
- ✅ Admin no puede eliminarse a sí mismo
- ✅ isActive sigue usándose para desactivación temporal (diferente de eliminación)

---

#### 6.2 - Mejorar Manejo de Excepciones Consistente

**Problema:** [USERS-008] - Mensajes de error genéricos inconsistentes

**Archivos Afectados:**

- `src/modules/users/users.service.ts` (y otros services)

**Implementación:**

```typescript
async create(createUserDto: CreateUserDto): Promise<User> {
  try {
    // Verificar email único
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // ... lógica de creación ...
    const user = await this.userRepository.save(newUser);
    return user;

  } catch (error) {
    // Re-lanzar excepciones conocidas
    if (error instanceof ConflictException) {
      throw error;
    }

    // Re-lanzar excepciones de validación
    if (error instanceof BadRequestException) {
      throw error;
    }

    // Para errores inesperados, loggear y lanzar genérico
    this.logger.error(
      `Unexpected error creating user: ${error.message}`,
      error.stack,
    );
    throw new InternalServerErrorException(
      'An unexpected error occurred while creating user',
    );
  }
}
```

**Principio:**

- Siempre re-lanzar excepciones conocidas (ConflictException, NotFoundException, etc.)
- Loggear error completo con stack trace
- Solo usar mensaje genérico para errores inesperados

---

#### 6.3 - Ejecutar Suite Completa de Tests

**Objetivo:** Validar que todas las correcciones no rompieron funcionalidad existente

**Comandos de Validación:**

```bash
# 1. Tests Unitarios
npm run test

# 2. Tests E2E
npm run test:e2e

# 3. Coverage
npm run test:cov

# 4. Linting
npm run lint

# 5. Type Checking
npm run type-check

# 6. Build de Producción
npm run build
```

**Métricas Esperadas:**

- ✅ Tests unitarios: 100% passing
- ✅ Tests E2E: 100% passing
- ✅ Coverage: >75%
- ✅ Linting: 0 errores
- ✅ Type check: 0 errores
- ✅ Build: exitoso

**Validaciones Específicas:**

```bash
# Test de RolesGuard
npm run test -- roles.guard.spec.ts

# Test de Users (con nuevos guards)
npm run test:e2e -- users.e2e-spec.ts

# Test de Products (con nuevos guards)
npm run test:e2e -- products.e2e-spec.ts

# Test de Categories (con nuevos guards)
npm run test:e2e -- categories.e2e-spec.ts

# Test de Auth (con rate limiting)
npm run test:e2e -- auth.e2e-spec.ts
```

---

### ✅ Validaciones de Fase 6

**Checklist de Completitud:**

- [x] Soft delete implementado correctamente con deletedAt
- [x] Admin no puede eliminarse a sí mismo
- [x] Manejo de excepciones consistente en todos los services
- [x] Todos los tests unitarios pasan (arreglados y actualizados)
- [x] Linting sin errores
- [x] Type-check sin errores
- [ ] Todos los tests E2E pasan (pendiente validación individual por módulo)
- [ ] Coverage >75%

---

## 📊 Checklist de Validación Final

Antes de considerar el plan completado:

### ✅ Seguridad

- [ ] Sistema de roles (ADMIN/USER) implementado y funcionando
- [ ] Todos los endpoints administrativos protegidos con @Roles(ADMIN)
- [ ] Rate limiting implementado en Auth endpoints
- [ ] Bull Board protegido con Basic Auth
- [ ] Validaciones de LoginDto corregidas (no revelan políticas)
- [ ] Soft delete implementado correctamente con deletedAt

### ✅ Testing

- [ ] Tests unitarios pasan al 100%
- [ ] Tests E2E pasan al 100%
- [ ] Coverage >75% en módulos críticos
- [ ] Tests de RolesGuard completos
- [ ] Tests E2E de autorización en todos los módulos

### ✅ Documentación

- [ ] Swagger actualizado con notas "Admin only"
- [ ] Variables de entorno documentadas en .env.example
- [ ] README actualizado con sistema de roles
- [ ] ADR de RBAC creado (opcional)

### ✅ Code Quality

- [ ] Linting sin errores
- [ ] Type checking sin errores
- [ ] Build de producción exitoso
- [ ] Migraciones ejecutadas correctamente

### ✅ Validación Manual

```bash
# 1. Crear usuario normal
curl -X POST "$BASE_URL/auth/register" -d '{"email":"user@test.com","password":"Password123!"}'

# 2. Login usuario normal
NORMAL_TOKEN=$(curl -X POST "$BASE_URL/auth/login" -d '{"email":"user@test.com","password":"Password123!"}' | jq -r '.access_token')

# 3. Intentar crear producto (debe fallar con 403)
curl -X POST "$BASE_URL/products" -H "Authorization: Bearer $NORMAL_TOKEN" -d '{"name":"Test","price":10}'
# Espera: 403 Forbidden

# 4. Login admin
ADMIN_TOKEN=$(curl -X POST "$BASE_URL/auth/login" -d '{"email":"admin@test.com","password":"Admin123!"}' | jq -r '.access_token')

# 5. Crear producto como admin (debe funcionar)
curl -X POST "$BASE_URL/products" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"name":"Test","price":10}'
# Espera: 201 Created

# 6. Intentar acceder a Bull Board sin autenticación (debe pedir credenciales)
curl http://localhost:3002/api/v1/admin/queues
# Espera: 401 Unauthorized (Basic Auth required)
```

---

## 📈 Métricas de Éxito

### Antes de las Correcciones:

- **Vulnerabilidades Críticas:** 17
- **Endpoints sin protección:** ~20
- **Sistema de Roles:** ❌ No existe
- **Rate Limiting:** ❌ No implementado
- **Bull Board:** ❌ Público sin auth
- **Soft Delete:** ⚠️ Implementación incorrecta

### Después de las Correcciones:

- **Vulnerabilidades Críticas:** 0 ✅
- **Endpoints sin protección:** 0 ✅
- **Sistema de Roles:** ✅ RBAC completo (ADMIN/USER)
- **Rate Limiting:** ✅ Implementado en Auth
- **Bull Board:** ✅ Protegido con Basic Auth
- **Soft Delete:** ✅ Implementación correcta con deletedAt

---

## 🚀 Workflow de Desarrollo

### 1. Crear Branch de Trabajo

```bash
git checkout develop
git pull origin develop
git checkout -b fix/security-and-authorization
```

### 2. Trabajar Fase por Fase

Para cada fase:

```bash
# 1. Implementar tareas de la fase
# 2. Ejecutar validaciones locales
npm run lint
npm run type-check
npm run test
npm run test:e2e

# 3. Commit con mensaje descriptivo
git add .
git commit -m "feat(security): implement RBAC system - Phase 1 complete

- Add UserRole enum (ADMIN/USER)
- Create RolesGuard and @Roles() decorator
- Add migration for role column in users table
- Add unit tests for RolesGuard (100% coverage)

Refs: SECURITY_FIX_PLAN.md - Phase 1"

# 4. Push al repositorio
git push origin fix/security-and-authorization
```

### 3. Validación Continua

Después de cada commit:

```bash
# Validar que nada se rompió
npm run build
npm run test:cov
npm run test:e2e
```

### 4. Pull Request Final

Una vez completadas todas las fases:

```bash
# 1. Asegurar que todo está actualizado
git pull origin develop
git rebase develop

# 2. Ejecutar validación completa
npm run lint
npm run type-check
npm run test
npm run test:e2e
npm run test:cov

# 3. Crear Pull Request en GitHub
# Título: "fix: implement RBAC system and security fixes - 17 critical vulnerabilities resolved"
# Descripción: Referenciar SECURITY_FIX_PLAN.md y listar problemas resueltos
```

---

## 📝 Notas Importantes

### Priorización

1. **🔴 FASE 1-4: CRÍTICAS** - Resolver primero (sistema de roles y autorización)
2. **🟡 FASE 5: ALTA** - Resolver después (rate limiting, Bull Board auth)
3. **🟢 FASE 6: MEDIA** - Resolver al final (soft delete, mejoras de UX)

### Despliegue

**⚠️ NO DESPLEGAR A PRODUCCIÓN** hasta completar al menos las **FASES 1-4**.

Las vulnerabilidades críticas de autorización hacen que el sistema sea inseguro para producción.

### Testing

- Ejecutar tests **después de cada fase**
- Validar que coverage no disminuya
- Confirmar que tests E2E pasan con nuevos guards

### Documentación

- Actualizar Swagger con notas "Admin only"
- Documentar variables de entorno en .env.example
- Considerar crear ADR para RBAC implementation

---

## 🎯 Próximos Pasos Después del Plan

Una vez completado este plan, considerar:

1. **Auditoría de Logs:** Implementar logging de acciones administrativas
2. **Multi-Factor Authentication (MFA):** Para cuentas ADMIN
3. **IP Whitelisting:** Para endpoints administrativos
4. **API Keys:** Para integraciones externas
5. **Rate Limiting Avanzado:** Por IP, por usuario, por endpoint
6. **CAPTCHA:** Después de N intentos fallidos de login
7. **Session Management:** Revocación de tokens, logout de todas las sesiones

---

**Fecha de Última Actualización:** 13 de Octubre, 2025  
**Autor:** Equipo de Desarrollo  
**Revisado por:** -  
**Estado:** ✅ APROBADO PARA IMPLEMENTACIÓN
