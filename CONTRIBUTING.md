# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir al Sistema Procesador de Órdenes Asíncrono! Esta guía te ayudará a entender cómo puedes participar en el proyecto.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo puedo contribuir?](#cómo-puedo-contribuir)
- [Configuración del Entorno de Desarrollo](#configuración-del-entorno-de-desarrollo)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Estándares de Código](#estándares-de-código)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas este estándar.

### Nuestros Estándares

**Comportamientos que contribuyen a un ambiente positivo:**

- ✅ Ser respetuoso y inclusivo
- ✅ Aceptar críticas constructivas
- ✅ Enfocarse en lo que es mejor para la comunidad
- ✅ Mostrar empatía hacia otros miembros

**Comportamientos inaceptables:**

- ❌ Uso de lenguaje o imágenes sexualizadas
- ❌ Trolling, insultos o comentarios despectivos
- ❌ Acoso público o privado
- ❌ Publicar información privada de otros sin permiso

## 🤔 ¿Cómo puedo contribuir?

### 🐛 Reportar Bugs

- Usa el template de [bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- Incluye pasos claros para reproducir
- Proporciona información del entorno
- Adjunta logs relevantes

### 💡 Sugerir Funcionalidades

- Usa el template de [feature request](.github/ISSUE_TEMPLATE/feature_request.md)
- Explica claramente el problema que resuelve
- Describe la solución propuesta
- Considera alternativas

### 📖 Mejorar Documentación

- Usa el template de [documentation issue](.github/ISSUE_TEMPLATE/documentation.md)
- Identifica qué está incompleto o confuso
- Propone mejoras específicas

### 🔧 Contribuir con Código

- Implementa nuevas funcionalidades
- Corrige bugs existentes
- Mejora tests y coverage
- Optimiza performance
- Refactoriza código

## ⚙️ Configuración del Entorno de Desarrollo

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Docker y Docker Compose
- PostgreSQL 15+ (o usar Docker)
- Redis 7.x (o usar Docker)
- Git

### Setup Local

1. **Fork y Clone**

   ```bash
   git clone https://github.com/tu-usuario/ecommerce-async-resilient-system.git
   cd ecommerce-async-resilient-system
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edita .env con tus configuraciones locales
   ```

4. **Start Services**

   ```bash
   # Opción 1: Con Docker
   docker-compose up -d postgres redis

   # Opción 2: Servicios locales
   # Asegúrate de que PostgreSQL y Redis estén corriendo
   ```

5. **Database Setup**

   ```bash
   npm run migration:run
   npm run seed:run  # opcional
   ```

6. **Start Application**

   ```bash
   npm run start:dev
   ```

7. **Verify Setup**
   - App: http://localhost:3000
   - API Docs: http://localhost:3000/api/docs
   - Health: http://localhost:3000/api/v1/health

## 🔄 Flujo de Trabajo

### Branching Strategy

Usamos **Git Flow** modificado:

- **`main`**: Código de producción
- **`develop`**: Desarrollo principal
- **`feature/*`**: Nuevas funcionalidades
- **`bugfix/*`**: Corrección de bugs
- **`hotfix/*`**: Correcciones urgentes de producción
- **`release/*`**: Preparación de releases

### Workflow Típico

1. **Crear Branch**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Desarrollo**

   ```bash
   # Hacer cambios
   npm run test        # Ejecutar tests
   npm run lint        # Verificar linting
   npm run type-check  # Verificar tipos
   ```

3. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add order processing saga"
   ```

4. **Push y PR**
   ```bash
   git push origin feature/nueva-funcionalidad
   # Crear Pull Request en GitHub
   ```

## 📏 Estándares de Código

### TypeScript Standards

- **Strict mode** habilitado
- **No any** permitido (usar unknown o tipos específicos)
- **Interfaces** para definir contratos
- **Enums** para constantes relacionadas
- **Generics** cuando sea apropiado

### NestJS Best Practices

- **Decoradores** apropiados (@Injectable, @Controller, etc.)
- **DTOs** para validación de entrada
- **Guards** para autenticación/autorización
- **Interceptors** para cross-cutting concerns
- **Pipes** para transformación de datos
- **Filters** para manejo de excepciones

### Naming Conventions

```typescript
// Files
user.controller.ts;
user.service.ts;
create - user.dto.ts;
user.entity.ts;

// Classes
export class UserController {}
export class CreateUserDto {}
export class UserService {}

// Interfaces
export interface PaymentProvider {}
export interface QueueJob {}

// Constants/Enums
export enum OrderStatus {}
export const DEFAULT_PAGE_SIZE = 10;
```

### Code Structure

```typescript
// Imports order
import { ... } from '@nestjs/common';
import { ... } from '@nestjs/typeorm';

import { ... } from '../shared';
import { ... } from './dto';
import { ... } from './entities';

// Class structure
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }
}
```

## 📝 Commit Message Guidelines

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

### Formato

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: Nueva funcionalidad
- **fix**: Corrección de bug
- **docs**: Cambios en documentación
- **style**: Cambios de formato (no afectan lógica)
- **refactor**: Refactoring de código
- **perf**: Mejoras de performance
- **test**: Añadir o modificar tests
- **chore**: Cambios en build, CI, dependencias

### Examples

```bash
feat(orders): add saga pattern for order processing
fix(auth): resolve JWT token expiration issue
docs(api): update swagger documentation for payments
test(inventory): add unit tests for stock reservation
refactor(queue): optimize Bull queue configuration
perf(db): add indexes for order queries
chore(deps): update @nestjs/core to v10.2.0
```

### Scopes Sugeridos

- `auth` - Autenticación y autorización
- `orders` - Sistema de órdenes
- `payments` - Procesamiento de pagos
- `inventory` - Gestión de inventario
- `notifications` - Sistema de notificaciones
- `queues` - Procesamiento de colas
- `db` - Base de datos
- `api` - API endpoints
- `tests` - Testing
- `docs` - Documentación
- `ci` - CI/CD

## 🔍 Pull Request Process

### Before Creating PR

1. **Tests Pass**

   ```bash
   npm run test
   npm run test:e2e
   ```

2. **Code Quality**

   ```bash
   npm run lint
   npm run type-check
   npm run format
   ```

3. **Build Success**
   ```bash
   npm run build
   ```

### PR Requirements

- ✅ **Descriptive title** siguiendo conventional commits
- ✅ **Complete description** usando el template
- ✅ **Link related issues** (fixes #123)
- ✅ **All checks pass** (CI/CD pipeline)
- ✅ **Tests added/updated** para nuevos features
- ✅ **Documentation updated** si es necesario
- ✅ **No merge conflicts**

### Review Process

1. **Automated Checks** deben pasar
2. **Peer Review** por al menos 1 maintainer
3. **Manual Testing** si es necesario
4. **Approval** antes de merge

### After Approval

- **Squash and Merge** para features pequeñas
- **Merge Commit** para features grandes
- **Rebase and Merge** para fix pequeños

## 🐛 Reportar Bugs

### Antes de Reportar

1. **Busca issues existentes** para evitar duplicados
2. **Reproduce** el bug en la versión más reciente
3. **Verifica** que no sea un problema de configuración

### Information to Include

- **Descripción clara** del problema
- **Pasos para reproducir** (específicos)
- **Comportamiento esperado** vs actual
- **Screenshots** si es relevante
- **Environment info** (OS, Node version, etc.)
- **Logs relevantes** o error messages
- **Possible workaround** si encontraste uno

## 💡 Sugerir Mejoras

### Tipos de Mejoras

- **Nuevas funcionalidades**
- **Mejoras de performance**
- **Mejor UX/DX**
- **Refactoring significativo**
- **Mejoras de arquitectura**

### Proposal Process

1. **Create issue** usando feature request template
2. **Discuss** con maintainers si es necesario
3. **Get approval** antes de implementar
4. **Implement** siguiendo los estándares
5. **Create PR** con descripción completa

## 🏷️ Labels y Project Management

### Priority Labels

- `priority: critical` - Debe arreglarse inmediatamente
- `priority: high` - Importante para próximo release
- `priority: medium` - Planificado para releases futuros
- `priority: low` - Nice to have

### Status Labels

- `status: needs-triage` - Necesita evaluación inicial
- `status: in-progress` - En desarrollo activo
- `status: blocked` - Bloqueado por dependencia externa
- `status: ready-for-review` - Listo para code review

### Area Labels

- `area: auth` - Autenticación
- `area: orders` - Procesamiento de órdenes
- `area: payments` - Sistema de pagos
- `area: inventory` - Gestión de inventario
- `area: queues` - Sistema de colas

## 🚀 Release Process

### Version Numbering

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. **Create release branch** from develop
2. **Update version** en package.json
3. **Update CHANGELOG.md**
4. **Test thoroughly**
5. **Merge to main**
6. **Tag release**
7. **Deploy to production**
8. **Merge back to develop**

## 📞 Getting Help

### Where to Ask

- **GitHub Issues**: Para bugs y feature requests
- **GitHub Discussions**: Para preguntas generales
- **Code Reviews**: Para feedback específico de código

### Information to Provide

- **Clear question** o problema
- **Context** sobre qué estás tratando de hacer
- **What you tried** y qué no funcionó
- **Relevant code snippets** (formatted properly)
- **Error messages** completos

---

## 🙏 Reconocimiento

Valoramos todas las contribuciones, grandes y pequeñas. Los contribuidores serán reconocidos en:

- **README.md** - Lista de contribuidores
- **CHANGELOG.md** - Reconocimiento en releases
- **GitHub Contributors** - Automáticamente trackado

## 📄 License

Al contribuir, aceptas que tus contribuciones serán licenciadas bajo la [MIT License](LICENSE).

---

**¡Gracias por contribuir! 🎉**

Tu participación hace que este proyecto sea mejor para todos. Si tienes preguntas sobre esta guía, no dudes en crear un issue o contactarnos directamente.
