# Análisis del Módulo Auth - Refactorización de Tests

**Fecha:** 5 de Octubre, 2025
**Módulo:** Auth (`src/modules/auth/`)
**Archivos a refactorizar:** 3 archivos (1,320 líneas)

---

## 📊 Archivos Actuales

| Archivo                          | Líneas | Estado      | Acción                  |
| -------------------------------- | ------ | ----------- | ----------------------- |
| `auth.service.spec.ts`           | 573    | 🔴 Refactor | Dividir en 2-3 archivos |
| `current-user.decorator.spec.ts` | 386    | 🔴 Refactor | Dividir en 2 archivos   |
| `auth.controller.spec.ts`        | 361    | 🔴 Refactor | Dividir en 2 archivos   |
| `jwt.strategy.spec.ts`           | 198    | 🟢 OK       | Mantener                |
| `jwt-auth.guard.spec.ts`         | 155    | 🟢 OK       | Mantener                |

**Total:** 1,673 líneas | **Requiere refactor:** 1,320 líneas

---

## 🔍 Análisis Detallado: auth.service.spec.ts (573 líneas)

### Estructura Actual

```
AuthService (573 líneas)
├── Setup y Mocks (1-100)
│   ├── Imports
│   ├── mockUser definition
│   └── beforeEach con providers
├── Basic test (100-103)
│   └── should be defined
├── describe: register (104-162) - ~60 líneas
│   ├── Happy path: register new user
│   ├── Error: email already exists
│   └── Edge: email normalization
├── describe: login (163-232) - ~70 líneas
│   ├── Happy path: valid credentials
│   ├── Error: user not found
│   ├── Error: user inactive
│   ├── Error: incorrect password
│   └── Side effect: update last login
├── describe: validateUser (233-298) - ~66 líneas
│   ├── Happy path: valid credentials
│   ├── Null: user not found
│   ├── Null: incorrect password
│   ├── Null: user inactive
│   └── Null: validation error
├── describe: refreshToken (299-370) - ~72 líneas
│   ├── Happy path: valid refresh token
│   ├── Error: wrong token type
│   ├── Error: invalid token
│   ├── Error: expired token
│   ├── Error: user not found
│   └── Error: user inactive
├── describe: generateTokens (371-432) - ~62 líneas
│   ├── Should generate access and refresh tokens
│   ├── Access token should have correct payload
│   ├── Refresh token should have correct payload
│   └── Should use correct JWT configs
├── describe: hashPassword (433-473) - ~41 líneas
│   ├── Should hash password correctly
│   ├── Should generate different hashes
│   └── Error handling
├── describe: verifyPassword (474-523) - ~50 líneas
│   ├── Should return true for correct password
│   ├── Should return false for incorrect password
│   └── Error handling
└── describe: verifyToken (524-574) - ~51 líneas
    ├── Should verify valid access token
    ├── Should verify valid refresh token
    ├── Error: invalid token
    ├── Error: expired token
    └── Error: token without type
```

### Propuesta de División

#### Opción A: División por Método/Función (3 archivos)

```
1. auth.service.core.spec.ts (~200 líneas)
   - Setup compartido
   - register
   - login
   - validateUser

2. auth.service.tokens.spec.ts (~180 líneas)
   - Setup compartido
   - refreshToken
   - generateTokens
   - verifyToken

3. auth.service.security.spec.ts (~150 líneas)
   - Setup compartido
   - hashPassword
   - verifyPassword
   - Security edge cases
```

#### Opción B: División por Responsabilidad (2 archivos + helpers)

```
1. auth.service.authentication.spec.ts (~250 líneas)
   - Setup compartido
   - register (happy path + errors)
   - login (happy path + errors)
   - validateUser (all cases)

2. auth.service.tokens.spec.ts (~250 líneas)
   - Setup compartido
   - refreshToken (all cases)
   - generateTokens (all cases)
   - verifyToken (all cases)
   - hashPassword (all cases)
   - verifyPassword (all cases)

3. helpers/auth.test-helpers.ts (~70 líneas)
   - createMockUser factory
   - createMockJwtService
   - createMockUsersService
   - createMockConfigService
   - setupAuthTestModule
   - Token generation helpers
```

### ✅ Recomendación: Opción B

**Razón:** Agrupa mejor las responsabilidades funcionales y facilita encontrar tests específicos.

---

## 🔍 Análisis Detallado: current-user.decorator.spec.ts (386 líneas)

### Estructura Actual (a verificar)

Necesito analizar el contenido completo para proponer división.

### Propuesta Preliminar

```
1. current-user.decorator.core.spec.ts (~180 líneas)
   - Happy paths principales
   - Extracción básica de usuario del request

2. current-user.decorator.edge-cases.spec.ts (~150 líneas)
   - Edge cases y validaciones
   - Manejo de errores
   - Casos especiales

3. helpers/auth.test-helpers.ts (compartido)
   - Factories para requests con user
   - Mock execution contexts
```

---

## 🔍 Análisis Detallado: auth.controller.spec.ts (361 líneas)

### Estructura Actual (a verificar)

Necesito analizar el contenido completo para proponer división.

### Propuesta Preliminar

```
1. auth.controller.endpoints.spec.ts (~200 líneas)
   - POST /auth/register
   - POST /auth/login
   - POST /auth/refresh

2. auth.controller.validations.spec.ts (~150 líneas)
   - DTO validations
   - Error responses
   - Edge cases

3. helpers/auth.test-helpers.ts (compartido)
   - HTTP request mocks
   - Response factories
```

---

## 📦 Estructura Final Propuesta del Módulo Auth

```
src/modules/auth/
├── auth.service.authentication.spec.ts (~250 líneas)
├── auth.service.tokens.spec.ts (~250 líneas)
├── auth.controller.endpoints.spec.ts (~200 líneas)
├── auth.controller.validations.spec.ts (~150 líneas)
├── current-user.decorator.core.spec.ts (~180 líneas)
├── current-user.decorator.edge-cases.spec.ts (~150 líneas)
├── jwt.strategy.spec.ts (198 líneas - sin cambios)
├── jwt-auth.guard.spec.ts (155 líneas - sin cambios)
└── helpers/
    └── auth.test-helpers.ts (~100 líneas)
```

**Total archivos:** 9 archivos (5 refactorizados + 2 sin cambios + 2 nuevos)
**Promedio líneas/archivo:** ~185 líneas

---

## 🎯 Patrones a Aplicar

### 1. Test.each() para Casos Similares

**Antes:**

```typescript
it('should throw UnauthorizedException when user does not exist', async () => {
  // test
});

it('should throw UnauthorizedException when user account is inactive', async () => {
  // test
});

it('should throw UnauthorizedException when password is incorrect', async () => {
  // test
});
```

**Después:**

```typescript
describe('login errors', () => {
  test.each([
    ['user not found', null, 'Invalid credentials'],
    ['user inactive', { ...mockUser, isActive: false }, 'Account inactive'],
    ['wrong password', mockUser, 'Invalid credentials', true],
  ])(
    'should throw UnauthorizedException when %s',
    async (scenario, user, message, wrongPassword) => {
      // unified test logic
    },
  );
});
```

### 2. Factories Pattern

```typescript
// helpers/auth.test-helpers.ts

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  passwordHash: '$2b$10$hashedpassword',
  isActive: true,
  phoneNumber: faker.phone.number(),
  dateOfBirth: faker.date.birthdate(),
  language: 'en',
  timezone: 'UTC',
  emailVerifiedAt: undefined,
  lastLoginAt: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
  // Mock methods
  hashPassword: jest.fn(),
  validatePassword: jest.fn().mockResolvedValue(true),
  ...
});

export const createRegisterDto = (overrides: Partial<RegisterDto> = {}): RegisterDto => ({
  email: faker.internet.email(),
  password: 'Test123!',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  ...overrides,
});

export const createLoginDto = (overrides: Partial<LoginDto> = {}): LoginDto => ({
  email: 'test@example.com',
  password: 'Test123!',
  ...overrides,
});
```

### 3. Setup Helpers

```typescript
export const setupAuthTestModule = async () => {
  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: UsersService, useValue: mockUsersService },
      { provide: JwtService, useValue: mockJwtService },
      { provide: ConfigService, useValue: mockConfigService },
    ],
  }).compile();

  return {
    service: module.get<AuthService>(AuthService),
    usersService: module.get(UsersService) as jest.Mocked<UsersService>,
    jwtService: module.get(JwtService) as jest.Mocked<JwtService>,
    configService: module.get(ConfigService) as jest.Mocked<ConfigService>,
  };
};
```

---

## 📋 Próximos Pasos

### 1. Leer y Analizar Archivos Restantes

- [ ] `current-user.decorator.spec.ts` completo
- [ ] `auth.controller.spec.ts` completo

### 2. Crear Archivo de Helpers

- [ ] `helpers/auth.test-helpers.ts`
- [ ] Factories
- [ ] Setup functions
- [ ] Mock generators

### 3. Refactorizar auth.service.spec.ts

- [ ] Crear `auth.service.authentication.spec.ts`
- [ ] Crear `auth.service.tokens.spec.ts`
- [ ] Migrar tests
- [ ] Implementar test.each()

### 4. Refactorizar auth.controller.spec.ts

- [ ] Analizar estructura
- [ ] Crear archivos divididos
- [ ] Migrar tests

### 5. Refactorizar current-user.decorator.spec.ts

- [ ] Analizar estructura
- [ ] Crear archivos divididos
- [ ] Migrar tests

### 6. Validaciones de Calidad

- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test:cov`
- [ ] `npm run test -- --findRelatedTests src/modules/auth`
- [ ] `npm run build`

### 7. Commit y Push

- [ ] Git add archivos
- [ ] Commit con mensaje descriptivo
- [ ] Push a rama
- [ ] Validar CI pipeline

---

**Documento de trabajo - Task 17 Módulo Auth**
