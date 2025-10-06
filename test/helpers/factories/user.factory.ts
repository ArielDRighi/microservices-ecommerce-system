import { Repository } from 'typeorm';
import { User } from '../../../src/modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

/**
 * Factory para crear usuarios de test
 */
export class UserFactory {
  /**
   * Crea un usuario básico
   * @param repository - Repositorio de User
   * @param overrides - Propiedades personalizadas
   */
  static async create(repository: Repository<User>, overrides: Partial<User> = {}): Promise<User> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);

    const defaultUser = {
      email: `user-${timestamp}-${randomSuffix}@test.com`,
      passwordHash: await bcrypt.hash('Test123!', 10),
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      ...overrides,
    };

    const user = repository.create(defaultUser);
    return await repository.save(user);
  }

  /**
   * Crea un usuario admin
   * @param repository - Repositorio de User
   * @param overrides - Propiedades personalizadas
   */
  static async createAdmin(
    repository: Repository<User>,
    overrides: Partial<User> = {},
  ): Promise<User> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);

    return await this.create(repository, {
      email: `admin-${timestamp}-${randomSuffix}@test.com`,
      firstName: 'Admin',
      lastName: 'User',
      // Note: Role management might need to be added based on your User entity
      ...overrides,
    });
  }

  /**
   * Crea múltiples usuarios
   * @param repository - Repositorio de User
   * @param count - Cantidad de usuarios a crear
   */
  static async createMany(repository: Repository<User>, count: number): Promise<User[]> {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const user = await this.create(repository, {
        email: `user-${Date.now()}-${i}@test.com`,
        firstName: `User${i}`,
        lastName: `Test${i}`,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Crea un usuario con credenciales conocidas para testing
   * @param repository - Repositorio de User
   */
  static async createWithKnownPassword(
    repository: Repository<User>,
    email: string,
    password: string,
  ): Promise<{ user: User; password: string }> {
    const user = await this.create(repository, {
      email,
      passwordHash: await bcrypt.hash(password, 10),
    });

    return { user, password };
  }
}
