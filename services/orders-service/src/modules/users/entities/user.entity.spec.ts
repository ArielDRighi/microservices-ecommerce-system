import { User } from './user.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.id = '123e4567-e89b-12d3-a456-426614174000';
    user.email = 'test@example.com';
    user.firstName = 'John';
    user.lastName = 'Doe';
    user.isActive = true;
    user.createdAt = new Date();
    user.updatedAt = new Date();
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      // Set a plain password and let the entity hash it
      user.passwordHash = 'secret';
      await user.hashPassword(); // This will hash the password

      const isValid = await user.validatePassword('secret');
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      user.passwordHash = 'secret';
      await user.hashPassword();

      const isValid = await user.validatePassword('wrong');
      expect(isValid).toBe(false);
    });
  });
  describe('fullName getter', () => {
    it('should return full name', () => {
      const fullName = user.fullName;
      expect(fullName).toBe('John Doe');
    });
  });

  describe('markEmailAsVerified', () => {
    it('should set emailVerifiedAt date', () => {
      user.markEmailAsVerified();
      expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateLastLogin', () => {
    it('should set lastLoginAt date', () => {
      user.updateLastLogin();
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('deactivate', () => {
    it('should mark user as inactive', () => {
      user.deactivate();
      expect(user.isActive).toBe(false);
    });
  });

  describe('activate', () => {
    it('should mark user as active', () => {
      user.isActive = false;
      user.activate();
      expect(user.isActive).toBe(true);
    });
  });

  describe('normalizeEmail', () => {
    it('should normalize email to lowercase and trim', () => {
      user.email = '  TEST@EXAMPLE.COM  ';
      user.normalizeEmail();
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('normalizeName', () => {
    it('should trim first and last name', () => {
      user.firstName = '  John  ';
      user.lastName = '  Doe  ';
      user.normalizeName();
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });
  });
});
