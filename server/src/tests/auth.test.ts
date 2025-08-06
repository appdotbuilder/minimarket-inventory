
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput } from '../schema';
import { login, logout, verifyToken, createPasswordHash } from '../handlers/auth';

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test user data
  const testUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin' as const
  };

  const createTestUser = async () => {
    const hashedPassword = createPasswordHash(testUserData.password);
    
    const result = await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        password_hash: hashedPassword,
        role: testUserData.role,
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  };

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser();
      
      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      const result = await login(loginInput);

      expect(result.user.id).toEqual(user.id);
      expect(result.user.username).toEqual(testUserData.username);
      expect(result.user.email).toEqual(testUserData.email);
      expect(result.user.role).toEqual(testUserData.role);
      expect(result.user.is_active).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify token structure (should have 3 parts separated by dots)
      const tokenParts = result.token.split('.');
      expect(tokenParts).toHaveLength(3);
    });

    it('should reject invalid username', async () => {
      await createTestUser();

      const loginInput: LoginInput = {
        username: 'nonexistent',
        password: testUserData.password
      };

      await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      await createTestUser();

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: 'wrongpassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject inactive user', async () => {
      const hashedPassword = createPasswordHash(testUserData.password);
      
      await db.insert(usersTable)
        .values({
          username: testUserData.username,
          email: testUserData.email,
          password_hash: hashedPassword,
          role: testUserData.role,
          is_active: false
        })
        .execute();

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      await expect(login(loginInput)).rejects.toThrow(/user account is inactive/i);
    });
  });

  describe('logout', () => {
    it('should logout with valid token', async () => {
      const user = await createTestUser();
      
      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      const loginResult = await login(loginInput);
      const result = await logout(loginResult.token);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(logout(invalidToken)).rejects.toThrow(/invalid token/i);
    });

    it('should reject malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      await expect(logout(malformedToken)).rejects.toThrow(/invalid token/i);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user', async () => {
      const user = await createTestUser();
      
      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      const loginResult = await login(loginInput);
      const result = await verifyToken(loginResult.token);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(user.id);
      expect(result!.username).toEqual(testUserData.username);
      expect(result!.email).toEqual(testUserData.email);
      expect(result!.role).toEqual(testUserData.role);
      expect(result!.is_active).toBe(true);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      const result = await verifyToken(invalidToken);
      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      const result = await verifyToken(malformedToken);
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const user = await createTestUser();
      
      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      const loginResult = await login(loginInput);

      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, user.id))
        .execute();

      const result = await verifyToken(loginResult.token);
      expect(result).toBeNull();
    });

    it('should return null for token with nonexistent user', async () => {
      // Create a token with fake payload (simulating deleted user)
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OTk5LCJ1c2VybmFtZSI6Im5vbmV4aXN0ZW50Iiwicm9sZSI6ImFkbWluIn0.invalid';

      const result = await verifyToken(fakeToken);
      expect(result).toBeNull();
    });
  });

  describe('password hashing', () => {
    it('should create different hashes for same password', async () => {
      const password = 'testpassword';
      const hash1 = createPasswordHash(password);
      const hash2 = createPasswordHash(password);

      expect(hash1).not.toEqual(hash2);
      expect(hash1.includes(':')).toBe(true);
      expect(hash2.includes(':')).toBe(true);
    });

    it('should verify password correctly', async () => {
      const user = await createTestUser();
      
      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      // Should not throw error
      const result = await login(loginInput);
      expect(result.user.username).toEqual(testUserData.username);
    });
  });
});
